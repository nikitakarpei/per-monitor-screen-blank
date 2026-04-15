import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { State, StateMachine } from '../domain/StateMachine.js';
import { shouldAutoBlack } from '../core/autoBlackPolicy.js';
import { resolveSettingsModeEffect } from '../core/modeLogic.js';
import { resolveMonitorMode } from '../util/monitorIdentity.js';
import { listRuntimeMonitors } from '../util/monitorSelection.js';
import { normalizeMode } from '../util/monitorModes.js';
import { logInfo, logErrorWithContext } from '../util/logger.js';

export class AppController {
    constructor({ settingsGateway, pointerActivitySource, deadlineScheduler, signalRegistrar, overlay, quickSettings, pointerContextMenu }) {
        this._settingsGateway = settingsGateway;
        this._pointerActivitySource = pointerActivitySource;
        this._deadlineScheduler = deadlineScheduler;
        this._signalRegistrar = signalRegistrar;
        this._overlay = overlay;
        this._quickSettings = quickSettings;
        this._pointerContextMenu = pointerContextMenu;
        this._stateMachines = new Map();
        this._monitorContexts = [];
        this._profiles = [];
        this._activeProfileId = '';
        this._lastModes = new Map();
        this._lastKeepAwakeMinutes = new Map();
        this._lastActivityByMonitorId = new Map();
        this._autoDeadlineTokens = new Map();
        this._keepAwakeDeadlineTokens = new Map();
    }

    enable() {
        Main.panel.statusArea.quickSettings?.addExternalIndicator(this._quickSettings);
        this._quickSettings.bindProfiles(
            () => ({ profiles: this._profiles, activeProfileId: this._activeProfileId }),
            profileId => this.switchProfile(profileId)
        );

        this._signalRegistrar.addDisconnector(this._settingsGateway.connectChanged(() => this._syncFromSettings()));
        this._signalRegistrar.connect(Main.layoutManager, 'monitors-changed', () => this._syncFromSettings());
        this._signalRegistrar.addDisconnector(this._settingsGateway.connectPointerShortcutChanged(() => this._reregisterPointerMenuShortcut()));
        this._reregisterPointerMenuShortcut();
        this._pointerActivitySource.start({
            onPointerActivity: activity => this._handlePointerActivity(activity),
        });

        this._syncFromSettings();
    }

    disable() {
        this._deadlineScheduler.cancelAll();
        this._pointerActivitySource.stop();
        this._signalRegistrar.disconnectAll();
        this._overlay.disable();
        this._quickSettings.destroy();
        this._pointerContextMenu?.destroy?.();
        this._unregisterPointerMenuShortcut();
    }

    setMode(mode) {
        this._setFocusedMonitorMode(mode, 'setMode');
    }

    switchProfile(profileId) {
        this._settingsGateway.setActiveProfile(profileId);
        this._syncFromSettings();
    }

    setKeepAwake() {
        this._setFocusedMonitorMode('keep-awake', 'setKeepAwake');
    }

    setDisabled() {
        this._setFocusedMonitorMode('disabled', 'setDisabled');
    }

    setBlackNow() {
        this._setFocusedMonitorMode('manual-black', 'setBlackNow');
    }

    openPointerMenu() {
        const target = this._getFocusedMonitor();
        this._pointerContextMenu?.open({
            currentMode: target?.mode ?? 'disabled',
        });
    }

    handleScheduledDeadline(deadline) {
        this._handleScheduledDeadline(deadline);
    }

    _syncFromSettings() {
        const snapshot = this._settingsGateway.getSnapshot();
        this._profiles = snapshot.profiles;
        this._activeProfileId = snapshot.activeProfileId;
        const runtimeMonitors = listRuntimeMonitors(global.display);
        const monitorModes = snapshot.monitorModes;
        const runtimeIds = new Set(runtimeMonitors.map(monitor => monitor.id));
        const unmatchedKeys = Object.keys(monitorModes).filter(key => !runtimeIds.has(key));
        const unmatchedActiveKeys = unmatchedKeys.filter(key => normalizeMode(monitorModes[key], 'disabled') !== 'disabled');
        if (unmatchedKeys.length > 0) {
            logInfo('monitor mode keys not present in runtime monitors', {
                unmatchedKeys,
                unmatchedActiveKeys,
            });
        }
        if (unmatchedActiveKeys.length > 0) {
            logInfo('monitor mapping mismatch', {
                activeProfileId: this._activeProfileId,
                unmatchedActiveKeys,
            });
        }
        this._monitorContexts = runtimeMonitors.map(monitor => ({
            ...monitor,
            mode: resolveMonitorMode(monitorModes, monitor, 'disabled'),
        }));
        if (this._monitorContexts.length === 0) {
            logInfo('no runtime monitors detected', {
                reason: 'GNOME runtime returned no monitors for Per-Monitor Screen Blank',
            });
        } else if (this._monitorContexts.every(monitor => monitor.mode === 'disabled')) {
            logInfo('all monitors are disabled in active profile', { activeProfileId: this._activeProfileId });
        }
        this._reconcileMonitorRuntimeState();
        this._overlay.setFadeDuration(snapshot.fadeDurationMs);
        this._overlay.setDimIntensityPercent(snapshot.dimIntensityPercent);
        this._quickSettings.visible = snapshot.showIndicator;
        for (const monitor of this._monitorContexts)
            this._applyModeSyncForMonitor(snapshot, monitor);
        this._seedCurrentPointerActivity();
        this._syncOverlay();
        this._quickSettings.refreshProfiles?.();
    }

    _syncOverlay() {
        const blackMonitors = [];
        for (const monitor of this._monitorContexts) {
            const machine = this._stateMachines.get(monitor.id);
            const state = machine?.state ?? State.Disabled;
            if (state === State.AutoBlack || state === State.ManualBlack)
                blackMonitors.push(monitor.index);
        }
        this._overlay.setBlackMonitors(blackMonitors);
    }

    _applyModeSyncForMonitor(snapshot, monitor) {
        const machine = this._getOrCreateMachine(monitor.id);
        const modeEffect = resolveSettingsModeEffect(
            monitor.mode,
            snapshot.keepAwakeMinutes,
            this._lastModes.get(monitor.id) ?? null,
            this._lastKeepAwakeMinutes.get(monitor.id) ?? null
        );

        if (modeEffect.transitionState) {
            machine.transition(modeEffect.transitionState, 'settings');
            machine.keepAwakeUntil = null;
        } else if (modeEffect.keepAwakeMs !== null) {
            machine.setKeepAwake(modeEffect.keepAwakeMs);
        } else if (monitor.mode === 'auto') {
            machine.keepAwakeUntil = null;
            if (machine.state !== State.AutoBlack)
                machine.transition(State.AutoAwake, 'settings');
        }

        this._lastModes.set(monitor.id, monitor.mode);
        this._lastKeepAwakeMinutes.set(monitor.id, snapshot.keepAwakeMinutes);
        this._rescheduleMonitor(snapshot, monitor, machine);
    }

    _getOrCreateMachine(monitorId) {
        let machine = this._stateMachines.get(monitorId);
        if (machine) return machine;

        machine = new StateMachine();
        machine.on('state-changed', () => {
            this._syncOverlay();
        });
        this._stateMachines.set(monitorId, machine);
        return machine;
    }

    _getFocusedMonitor() {
        const [x, y] = global.get_pointer();
        const monitor = this._monitorContexts.find(item => {
            const geometry = Main.layoutManager.monitors?.[item.index];
            if (!geometry) return false;
            return x >= geometry.x && x < geometry.x + geometry.width &&
                y >= geometry.y && y < geometry.y + geometry.height;
        });
        return monitor ?? this._monitorContexts.find(item => item.isPrimary) ?? this._monitorContexts[0] ?? null;
    }

    _setFocusedMonitorMode(mode, action) {
        const target = this._getFocusedMonitor();
        if (!target) {
            logInfo('focused monitor mode update skipped: no focused monitor', {
                action,
                mode,
                guidance: 'Move pointer to a monitor and try again',
            });
            return false;
        }

        this._settingsGateway.setMonitorMode(target, mode);
        this._syncFromSettings();
        return true;
    }

    _reconcileMonitorRuntimeState() {
        const now = Date.now();
        const activeMonitorIds = new Set(this._monitorContexts.map(monitor => monitor.id));
        for (const monitorId of [...this._stateMachines.keys()]) {
            if (activeMonitorIds.has(monitorId)) continue;
            this._stateMachines.delete(monitorId);
            this._lastModes.delete(monitorId);
            this._lastKeepAwakeMinutes.delete(monitorId);
            this._lastActivityByMonitorId.delete(monitorId);
            this._autoDeadlineTokens.delete(monitorId);
            this._keepAwakeDeadlineTokens.delete(monitorId);
            this._deadlineScheduler.cancelMonitor(monitorId);
        }

        for (const monitor of this._monitorContexts) {
            if (!this._lastActivityByMonitorId.has(monitor.id))
                this._lastActivityByMonitorId.set(monitor.id, now);
        }
    }

    _seedCurrentPointerActivity() {
        const snapshot = this._pointerActivitySource.getPointerSnapshot();
        if (!snapshot || !Number.isInteger(snapshot.monitorIndex)) {
            logInfo('pointer snapshot unavailable during state sync');
            return;
        }
        this._handlePointerActivity({
            ...snapshot,
            eventType: 'seed',
            previousMonitorIndex: null,
        });
    }

    _handlePointerActivity(activity) {
        const snapshot = this._settingsGateway.getSnapshot();
        this._reschedulePointerDeparture(snapshot, activity);
        const monitor = this._findMonitorByIndex(activity?.monitorIndex);
        const now = Date.now();

        if (!monitor) {
            if (this._monitorContexts.length === 0) return;
            logInfo('pointer activity ignored: monitor not found', { monitorIndex: activity?.monitorIndex });
            return;
        }

        if (monitor.mode !== 'auto') return;
        this._lastActivityByMonitorId.set(monitor.id, now);
        const machine = this._getOrCreateMachine(monitor.id);
        if (machine.state === State.AutoBlack)
            machine.transition(State.AutoAwake, 'pointer-activity');
        this._rescheduleMonitor(snapshot, monitor, machine);
    }

    _reschedulePointerDeparture(snapshot, activity) {
        if (!snapshot?.disableAutoTimerOnPointerMonitor)
            return;

        const previousMonitorIndex = activity?.previousMonitorIndex;
        const currentMonitorIndex = activity?.monitorIndex;
        if (!Number.isInteger(previousMonitorIndex) || previousMonitorIndex === currentMonitorIndex)
            return;

        const previousMonitor = this._findMonitorByIndex(previousMonitorIndex);
        if (!previousMonitor) {
            if (this._monitorContexts.length > 0) {
                logInfo('pointer departure reschedule skipped: previous monitor not found', {
                    previousMonitorIndex,
                    currentMonitorIndex,
                });
            }
            return;
        }

        if (previousMonitor.mode !== 'auto')
            return;

        this._rescheduleMonitor(snapshot, previousMonitor, this._getOrCreateMachine(previousMonitor.id));
    }

    _rescheduleMonitor(snapshot, monitor, machine = this._getOrCreateMachine(monitor.id)) {
        if (!monitor || !snapshot) return;
        if (monitor.mode === 'keep-awake' && machine.keepAwakeUntil !== null) {
            const token = this._nextDeadlineToken(this._keepAwakeDeadlineTokens, monitor.id);
            this._deadlineScheduler.scheduleKeepAwakeExpiry(monitor.id, machine.keepAwakeUntil, token);
            this._cancelAutoDeadline(monitor.id);
            return;
        }

        this._cancelKeepAwakeDeadline(monitor.id);
        if (monitor.mode !== 'auto') {
            this._cancelAutoDeadline(monitor.id);
            return;
        }

        const lastActivityAt = this._lastActivityByMonitorId.get(monitor.id) ?? Date.now();
        const targetIdleTimeMs = Date.now() - lastActivityAt;
        const isPointerOnTargetMonitor = this._pointerActivitySource.getPointerSnapshot().monitorIndex === monitor.index;
        if (snapshot.disableAutoTimerOnPointerMonitor && isPointerOnTargetMonitor) {
            if (machine.state === State.AutoBlack)
                machine.transition(State.AutoAwake, 'auto-reschedule');
            this._cancelAutoDeadline(monitor.id);
            return;
        }
        const shouldBlack = shouldAutoBlack({
            targetIdleTimeMs,
            idleTimeoutSeconds: snapshot.idleTimeoutSeconds,
            isCurrentlyAutoBlack: machine.state === State.AutoBlack,
            isPointerOnTargetMonitor,
        });
        if (shouldBlack) {
            machine.transition(State.AutoBlack, 'auto-deadline');
            this._cancelAutoDeadline(monitor.id);
            return;
        }

        if (machine.state !== State.AutoBlack)
            machine.transition(State.AutoAwake, 'auto-reschedule');
        const token = this._nextDeadlineToken(this._autoDeadlineTokens, monitor.id);
        const deadlineMs = lastActivityAt + Math.max(0, snapshot.idleTimeoutSeconds) * 1000;
        this._deadlineScheduler.scheduleAutoBlack(monitor.id, deadlineMs, token);
    }

    _nextDeadlineToken(tokenMap, monitorId) {
        const nextToken = (tokenMap.get(monitorId) ?? 0) + 1;
        tokenMap.set(monitorId, nextToken);
        return nextToken;
    }

    _cancelAutoDeadline(monitorId) {
        this._autoDeadlineTokens.delete(monitorId);
        this._deadlineScheduler.cancelAutoBlack(monitorId);
    }

    _cancelKeepAwakeDeadline(monitorId) {
        this._keepAwakeDeadlineTokens.delete(monitorId);
        this._deadlineScheduler.cancelKeepAwakeExpiry(monitorId);
    }

    _findMonitorByIndex(index) {
        if (!Number.isInteger(index)) return null;
        return this._monitorContexts.find(monitor => monitor.index === index) ?? null;
    }

    _handleScheduledDeadline({ kind, monitorId, token, deadlineMs }) {
        const snapshot = this._settingsGateway.getSnapshot();
        const monitor = this._monitorContexts.find(item => item.id === monitorId);
        if (!monitor) {
            logInfo('scheduled deadline skipped: monitor missing', { kind, monitorId, token, deadlineMs });
            return;
        }
        const tokenMap = kind === 'keep-awake-expiry' ? this._keepAwakeDeadlineTokens : this._autoDeadlineTokens;
        const expectedToken = tokenMap.get(monitorId);
        if (expectedToken !== token) {
            logInfo('scheduled deadline skipped: stale token', { kind, monitorId, token, expectedToken, deadlineMs });
            return;
        }

        if (kind === 'keep-awake-expiry') {
            tokenMap.delete(monitorId);
            const machine = this._getOrCreateMachine(monitorId);
            if (monitor.mode !== 'keep-awake' || machine.state !== State.KeepAwake) {
                logInfo('keep-awake expiry skipped: invalid state', {
                    monitorId,
                    mode: monitor.mode,
                    state: machine.state,
                    token,
                });
                return;
            }
            machine.keepAwakeUntil = null;
            this._settingsGateway.setMonitorMode(monitorId, 'auto');
            this._syncFromSettings();
            return;
        }

        tokenMap.delete(monitorId);
        const machine = this._getOrCreateMachine(monitorId);
        if (monitor.mode !== 'auto') {
            logInfo('auto-black deadline skipped: monitor no longer auto', { monitorId, mode: monitor.mode, token });
            return;
        }
        this._rescheduleMonitor(snapshot, monitor, machine);
    }

    _reregisterPointerMenuShortcut() {
        this._unregisterPointerMenuShortcut();
        const accel = this._settingsGateway.getPointerShortcutAccel();
        if (!accel) {
            logInfo('pointer menu shortcut is unset; keybinding not registered');
            return;
        }
        try {
            Main.wm.addKeybinding(
                'pointer-menu-shortcut',
                this._settingsGateway.getKeybindingSettings(),
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => this.openPointerMenu()
            );
        } catch (error) {
            logErrorWithContext(error, 'failed to register pointer-menu shortcut', { accel });
        }
    }

    _unregisterPointerMenuShortcut() {
        try {
            Main.wm.removeKeybinding('pointer-menu-shortcut');
        } catch (_) {
            // removeKeybinding throws when the binding is not registered; this is expected on
            // first run and whenever the shortcut is cleared, so the failure is intentionally silent.
        }
    }
}
