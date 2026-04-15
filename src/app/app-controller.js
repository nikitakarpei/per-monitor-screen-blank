import { State } from '../shared/domain/state-machine.js';
import { createSettingsSnapshot } from '../shared/domain/settings-snapshot.js';
import { logInfo } from '../shared/util/logger.js';
import { MonitorStateManager } from './monitor-state-manager.js';
import { MonitorDeadlineCoordinator } from './monitor-deadline-coordinator.js';
import { PointerActivityCoordinator } from './pointer-activity-coordinator.js';
import { SettingsSyncCoordinator } from './settings-sync-coordinator.js';

export class AppController {
    constructor({
        settingsGateway,
        pointerActivitySource,
        deadlineScheduler,
        signalRegistrar,
        overlay,
        quickSettings,
        pointerContextMenu,
        monitorProvider,
        keybindingManager,
    }) {
        this._settingsGateway = settingsGateway;
        this._pointerActivitySource = pointerActivitySource;
        this._deadlineScheduler = deadlineScheduler;
        this._signalRegistrar = signalRegistrar;
        this._overlay = overlay;
        this._quickSettings = quickSettings;
        this._pointerContextMenu = pointerContextMenu;
        this._monitorProvider = monitorProvider;
        this._keybindingManager = keybindingManager;
        this._monitorStateManager = new MonitorStateManager();
        this._settingsSyncCoordinator = new SettingsSyncCoordinator({
            monitorProvider,
            monitorStateManager: this._monitorStateManager,
            deadlineScheduler,
        });
        this._deadlineCoordinator = new MonitorDeadlineCoordinator({
            deadlineScheduler,
            pointerActivitySource,
            monitorStateManager: this._monitorStateManager,
        });
        this._pointerActivityCoordinator = new PointerActivityCoordinator({
            monitorStateManager: this._monitorStateManager,
            getMonitorByIndex: (index) => this._findMonitorByIndex(index),
            getMachine: (monitorId) => this._getOrCreateMachine(monitorId),
            rescheduleMonitor: (snapshot, monitor, machine) =>
                this._deadlineCoordinator.rescheduleMonitor(
                    snapshot,
                    monitor,
                    machine,
                ),
        });
        this._monitorContexts = [];
        this._profiles = [];
        this._activeProfileId = '';
    }

    enable() {
        this._quickSettings.enable?.();
        this._quickSettings.bindProfiles(
            () => ({
                profiles: this._profiles,
                activeProfileId: this._activeProfileId,
            }),
            (profileId) => this.switchProfile(profileId),
        );

        this._signalRegistrar.addDisconnector(
            this._settingsGateway.connectChanged(() =>
                this._syncFromSettings(),
            ),
        );
        this._signalRegistrar.addDisconnector(
            this._monitorProvider.onMonitorsChanged(() =>
                this._syncFromSettings(),
            ),
        );
        this._signalRegistrar.addDisconnector(
            this._settingsGateway.connectPointerShortcutChanged(() =>
                this._reregisterPointerMenuShortcut(),
            ),
        );
        this._reregisterPointerMenuShortcut();
        this._pointerActivitySource.start({
            onPointerActivity: (activity) =>
                this._handlePointerActivity(activity),
        });

        this._syncFromSettings();
    }

    disable() {
        this._deadlineScheduler.cancelAll();
        this._pointerActivitySource.stop();
        this._signalRegistrar.disconnectAll();
        this._monitorStateManager.clear();
        this._overlay.disable();
        this._quickSettings.destroy();
        this._pointerContextMenu?.destroy?.();
        this._keybindingManager.unregister('pointer-menu-shortcut');
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
        const snapshot = createSettingsSnapshot(
            this._settingsGateway.getSettingsData(),
        );
        this._profiles = snapshot.profiles;
        this._activeProfileId = snapshot.activeProfileId;
        this._monitorContexts =
            this._settingsSyncCoordinator.syncFromSettings(
                snapshot,
            ).monitorContexts;
        this._settingsSyncCoordinator.reconcileMonitorRuntimeState(
            this._monitorContexts,
        );
        this._overlay.setFadeDuration(snapshot.fadeDurationMs);
        this._overlay.setDimIntensityPercent(snapshot.dimIntensityPercent);
        this._quickSettings.visible = snapshot.showIndicator;
        for (const monitor of this._monitorContexts) {
            this._applyModeSyncForMonitor(snapshot, monitor);
        }
        this._seedCurrentPointerActivity();
        this._syncOverlay();
        this._quickSettings.refreshProfiles?.();
    }

    _syncOverlay() {
        const blackMonitors = [];
        for (const monitor of this._monitorContexts) {
            const state = this._monitorStateManager.getState(monitor.id);
            if (state === State.AutoBlack || state === State.ManualBlack) {
                blackMonitors.push(monitor.index);
            }
        }
        this._overlay.setBlackMonitors(blackMonitors);
    }

    _applyModeSyncForMonitor(snapshot, monitor) {
        const machine = this._getOrCreateMachine(monitor.id);
        this._settingsSyncCoordinator.syncMonitorSettings(snapshot, monitor);
        this._deadlineCoordinator.rescheduleMonitor(snapshot, monitor, machine);
    }

    _getOrCreateMachine(monitorId) {
        const machine = this._monitorStateManager.getMachine(monitorId);
        if (!machine._overlayListenerAttached) {
            machine.on('state-changed', () => {
                this._syncOverlay();
            });
            machine._overlayListenerAttached = true;
        }
        return machine;
    }

    _getFocusedMonitor() {
        const snapshot = this._pointerActivitySource.getPointerSnapshot();
        if (Number.isInteger(snapshot?.monitorIndex)) {
            const found = this._monitorContexts.find(
                (m) => m.index === snapshot.monitorIndex,
            );
            if (found) return found;
        }
        return (
            this._monitorContexts.find((item) => item.isPrimary) ??
            this._monitorContexts[0]
        );
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

    _seedCurrentPointerActivity() {
        const snapshot = this._pointerActivitySource.getPointerSnapshot();
        if (!snapshot || !Number.isInteger(snapshot.monitorIndex)) {
            logInfo('pointer snapshot unavailable during state sync');
            return;
        }
        this._handlePointerActivity({
            ...snapshot,
            eventType: 'seed',
            previousMonitorIndex: undefined,
        });
    }

    _handlePointerActivity(activity) {
        const snapshot = createSettingsSnapshot(
            this._settingsGateway.getSettingsData(),
        );
        this._pointerActivityCoordinator.handlePointerActivity(
            snapshot,
            activity,
        );
    }

    _reschedulePointerDeparture(snapshot, activity) {
        this._pointerActivityCoordinator.reschedulePointerDeparture(
            snapshot,
            activity,
        );
    }

    _findMonitorByIndex(index) {
        let monitor;
        if (Number.isInteger(index)) {
            monitor = this._monitorContexts.find(
                (item) => item.index === index,
            );
        }
        return monitor;
    }

    _handleScheduledDeadline({ deadlineKey, monitorId, token, deadlineMs }) {
        const snapshot = createSettingsSnapshot(
            this._settingsGateway.getSettingsData(),
        );
        const monitor = this._monitorContexts.find(
            (item) => item.id === monitorId,
        );
        if (!monitor) {
            logInfo('scheduled deadline skipped: monitor missing', {
                deadlineKey,
                monitorId,
                token,
                deadlineMs,
            });
            return;
        }
        if (deadlineKey === 'keep-awake-expiry') {
            const machine = this._getOrCreateMachine(monitorId);
            if (
                monitor.mode !== 'keep-awake' ||
                machine.state !== State.KeepAwake
            ) {
                logInfo('keep-awake expiry skipped: invalid state', {
                    monitorId,
                    mode: monitor.mode,
                    state: machine.state,
                    token,
                });
                return;
            }
            machine.keepAwakeUntil = undefined;
            this._settingsGateway.setMonitorMode(monitorId, 'auto');
            this._syncFromSettings();
            return;
        }
        const machine = this._getOrCreateMachine(monitorId);
        if (monitor.mode !== 'auto') {
            logInfo('auto-black deadline skipped: monitor no longer auto', {
                monitorId,
                mode: monitor.mode,
                token,
            });
            return;
        }
        this._deadlineCoordinator.rescheduleMonitor(snapshot, monitor, machine);
    }

    _reregisterPointerMenuShortcut() {
        this._keybindingManager.unregister('pointer-menu-shortcut');
        const accel = this._settingsGateway.getPointerShortcutAccel();
        if (!accel) {
            logInfo(
                'pointer menu shortcut is unset; keybinding not registered',
            );
            return;
        }
        this._keybindingManager.register(
            'pointer-menu-shortcut',
            this._settingsGateway.getKeybindingSettings(),
            () => this.openPointerMenu(),
        );
    }
}
