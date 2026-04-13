import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { State, StateMachine } from '../domain/StateMachine.js';
import { shouldAutoBlack } from '../core/autoBlackPolicy.js';
import { resolveSettingsModeEffect } from '../core/modeLogic.js';
import { buildStateViewModel } from '../presentation/stateViewModel.js';
import { listRuntimeMonitors } from '../util/monitorSelection.js';
import { normalizeMode } from '../util/monitorModes.js';
import { logInfo, logWarn, logErrorWithContext } from '../util/logger.js';

const POLL_INTERVAL_MS = 250;

export class AppController {
    constructor({ settingsGateway, runtimeProbe, signalRegistrar, overlay, quickSettings, pointerContextMenu }) {
        this._settingsGateway = settingsGateway;
        this._runtimeProbe = runtimeProbe;
        this._signalRegistrar = signalRegistrar;
        this._overlay = overlay;
        this._quickSettings = quickSettings;
        this._pointerContextMenu = pointerContextMenu;
        this._stateMachines = new Map();
        this._uiListeners = new Set();
        this._pollId = 0;
        this._monitorContexts = [];
        this._profiles = [];
        this._activeProfileId = '';
        this._lastModes = new Map();
        this._lastKeepAwakeMinutes = new Map();
        this._lastIssueNotification = '';
        const controller = this;
        this._uiStateSource = {
            get state() {
                return controller._getUiState();
            },
            on: (_signal, handler) => controller._subscribeUi(handler),
        };
    }

    enable() {
        Main.panel.statusArea.quickSettings?.addExternalIndicator(this._quickSettings);

        this._quickSettings.bindState(this._uiStateSource, state => buildStateViewModel(state));
        this._quickSettings.bindProfiles(
            () => ({ profiles: this._profiles, activeProfileId: this._activeProfileId }),
            profileId => this.switchProfile(profileId)
        );

        this._signalRegistrar.addDisconnector(this._settingsGateway.connectChanged(() => this._syncFromSettings()));
        this._signalRegistrar.connect(Main.layoutManager, 'monitors-changed', () => this._syncFromSettings());
        this._signalRegistrar.connect(global.display, 'primary-monitor-changed', () => this._syncFromSettings());
        this._signalRegistrar.addDisconnector(this._settingsGateway.connectPointerShortcutChanged(() => this._reregisterPointerMenuShortcut()));
        this._reregisterPointerMenuShortcut();

        this._syncFromSettings();
        this._pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_INTERVAL_MS, () => this._tick());
    }

    disable() {
        if (this._pollId) {
            GLib.Source.remove(this._pollId);
            this._pollId = 0;
        }
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
            logWarn('monitor mode keys not present in runtime monitors', {
                unmatchedKeys,
                unmatchedActiveKeys,
            });
        }
        if (unmatchedActiveKeys.length > 0) {
            this._notifyIssue(
                'Monitor mapping mismatch',
                `Profile "${this._activeProfileId}" has stale active monitor keys: ${unmatchedActiveKeys.join(', ')}. Re-select monitor modes in Preferences.`
            );
        }
        this._monitorContexts = runtimeMonitors.map(monitor => ({
            ...monitor,
            mode: normalizeMode(monitorModes[monitor.id], 'disabled'),
        }));
        if (this._monitorContexts.length === 0) {
            logWarn('no runtime monitors detected');
            this._notifyIssue('No monitors detected', 'GNOME runtime returned no monitors for Per-Monitor Screen Blank.');
        } else if (this._monitorContexts.every(monitor => monitor.mode === 'disabled')) {
            logInfo('all monitors are disabled in active profile', { activeProfileId: this._activeProfileId });
        }
        this._runtimeProbe.resetTargetActivity(this._monitorContexts.map(monitor => monitor.index));
        this._overlay.setFadeDuration(snapshot.fadeDurationMs);
        this._quickSettings.visible = snapshot.showIndicator;
        for (const monitor of this._monitorContexts)
            this._applyModeSyncForMonitor(snapshot, monitor);
        this._syncOverlay();
        this._emitUiStateChanged();
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

    _tick() {
        const snapshot = this._settingsGateway.getSnapshot();
        const monitorIndexes = this._monitorContexts.map(monitor => monitor.index);
        const runtimeByMonitor = this._runtimeProbe.sampleMonitors(monitorIndexes);

        for (const monitor of this._monitorContexts) {
            const machine = this._getOrCreateMachine(monitor.id);
            machine.update();
            if (monitor.mode !== 'auto') continue;
            const runtime = runtimeByMonitor[monitor.index];
            if (!runtime) {
                logWarn('missing runtime sample for monitor', { monitorId: monitor.id, index: monitor.index });
                continue;
            }
            const nextState = shouldAutoBlack({
                targetIdleTimeMs: runtime.targetIdleTimeMs,
                idleTimeoutSeconds: snapshot.idleTimeoutSeconds,
                wakeOnPointerEntry: snapshot.wakeOnPointerEntry,
                isCurrentlyAutoBlack: machine.state === State.AutoBlack,
                isPointerOnTargetMonitor: runtime.isPointerOnTargetMonitor,
            }) ? State.AutoBlack : State.AutoAwake;
            machine.transition(nextState, 'pointer-poll');
        }
        this._syncOverlay();
        this._emitUiStateChanged();
        return GLib.SOURCE_CONTINUE;
    }

    _applyModeSyncForMonitor(snapshot, monitor) {
        const machine = this._getOrCreateMachine(monitor.id);
        const modeEffect = resolveSettingsModeEffect(
            monitor.mode,
            snapshot.keepAwakeMinutes,
            this._lastModes.get(monitor.id) ?? null,
            this._lastKeepAwakeMinutes.get(monitor.id) ?? null
        );

        if (modeEffect.transitionState)
            machine.transition(modeEffect.transitionState, 'settings');
        else if (modeEffect.keepAwakeMs !== null)
            machine.setKeepAwake(modeEffect.keepAwakeMs);

        this._lastModes.set(monitor.id, monitor.mode);
        this._lastKeepAwakeMinutes.set(monitor.id, snapshot.keepAwakeMinutes);
    }

    _getOrCreateMachine(monitorId) {
        let machine = this._stateMachines.get(monitorId);
        if (machine) return machine;

        machine = new StateMachine();
        machine.on('state-changed', () => {
            this._syncOverlay();
            this._emitUiStateChanged();
        });
        machine.on('keep-awake-expired', () => {
            this._settingsGateway.setMonitorMode(monitorId, 'auto');
            this._syncFromSettings();
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

    _getUiState() {
        const focused = this._getFocusedMonitor();
        if (!focused) return State.Disabled;
        return this._stateMachines.get(focused.id)?.state ?? State.Disabled;
    }

    _setFocusedMonitorMode(mode, action) {
        const target = this._getFocusedMonitor();
        if (!target) {
            logWarn('focused monitor mode update skipped: no focused monitor', { action, mode });
            this._notifyIssue('No monitor under pointer', 'Move pointer to a monitor and try again.');
            return false;
        }

        this._settingsGateway.setMonitorMode(target.id, mode);
        this._syncFromSettings();
        return true;
    }

    _subscribeUi(handler) {
        this._uiListeners.add(handler);
        return () => this._uiListeners.delete(handler);
    }

    _emitUiStateChanged() {
        for (const listener of this._uiListeners)
            listener();
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
            this._notifyIssue('Shortcut registration failed', 'Could not register pointer menu shortcut.');
        }
    }

    _unregisterPointerMenuShortcut() {
        try {
            Main.wm.removeKeybinding('pointer-menu-shortcut');
        } catch (error) {
            logErrorWithContext(error, 'failed to unregister pointer-menu shortcut');
        }
    }

    _notifyIssue(title, details) {
        const signature = `${title}|${details}`;
        if (this._lastIssueNotification === signature) return;
        this._lastIssueNotification = signature;
        try {
            Main.notifyError(`Per-Monitor Screen Blank: ${title}`, details);
        } catch (error) {
            logErrorWithContext(error, 'failed to show error notification', { title, details });
        }
    }
}
