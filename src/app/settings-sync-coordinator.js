import { resolveMonitorMode } from '../shared/util/monitor-identity.js';
import { normalizeMode } from '../shared/util/monitor-modes.js';
import { logInfo } from '../shared/util/logger.js';

export class SettingsSyncCoordinator {
    constructor({ monitorProvider, monitorStateManager, deadlineScheduler }) {
        this._monitorProvider = monitorProvider;
        this._monitorStateManager = monitorStateManager;
        this._deadlineScheduler = deadlineScheduler;
    }

    syncFromSettings(snapshot) {
        const runtimeMonitors = this._monitorProvider
            .listMonitors()
            .filter((monitor) => monitor.isStable);
        const monitorModes = snapshot.monitorModes;
        const runtimeIds = new Set(
            runtimeMonitors.map((monitor) => monitor.id),
        );
        const unmatchedKeys = Object.keys(monitorModes).filter(
            (key) => !runtimeIds.has(key),
        );
        const unmatchedActiveKeys = unmatchedKeys.filter(
            (key) =>
                normalizeMode(monitorModes[key], 'disabled') !== 'disabled',
        );
        if (unmatchedKeys.length > 0) {
            logInfo('monitor mode keys not present in runtime monitors', {
                unmatchedKeys,
                unmatchedActiveKeys,
            });
        }
        if (unmatchedActiveKeys.length > 0) {
            logInfo('monitor mapping mismatch', {
                activeProfileId: snapshot.activeProfileId,
                unmatchedActiveKeys,
            });
        }
        const monitorContexts = runtimeMonitors.map((monitor) => ({
            ...monitor,
            mode: resolveMonitorMode(monitorModes, monitor, 'disabled'),
        }));
        if (monitorContexts.length === 0) {
            logInfo('no runtime monitors detected', {
                reason: 'platform returned no monitors for Per-Monitor Screen Blank',
            });
        } else if (
            monitorContexts.every((monitor) => monitor.mode === 'disabled')
        ) {
            logInfo('all monitors are disabled in active profile', {
                activeProfileId: snapshot.activeProfileId,
            });
        }
        return { monitorContexts };
    }

    syncMonitorSettings(snapshot, monitor) {
        this._monitorStateManager.syncMonitorSettings(snapshot, monitor);
    }

    reconcileMonitorRuntimeState(monitorContexts) {
        const activeMonitorIds = new Set(
            monitorContexts.map((monitor) => monitor.id),
        );
        for (const monitorId of this._monitorStateManager.getMonitorIds()) {
            if (activeMonitorIds.has(monitorId)) continue;
            this._monitorStateManager.removeMonitor(monitorId);
            this._deadlineScheduler.cancelMonitor(monitorId);
        }

        this._monitorStateManager.reconcileMonitors(monitorContexts);
    }
}
