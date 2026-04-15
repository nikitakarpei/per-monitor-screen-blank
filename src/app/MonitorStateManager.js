import { State, StateMachine } from '../shared/domain/StateMachine.js';
import { resolveSettingsModeEffect } from '../shared/core/modeLogic.js';

export class MonitorStateManager {
    constructor() {
        this._stateMachines = new Map();
        this._lastModes = new Map();
        this._lastKeepAwakeMinutes = new Map();
        this._lastActivityByMonitorId = new Map();
    }

    getMachine(monitorId) {
        return this._getOrCreateMachine(monitorId);
    }

    getState(monitorId) {
        return this._stateMachines.get(monitorId)?.state ?? State.Disabled;
    }

    getMonitorIds() {
        return [...this._stateMachines.keys()];
    }

    getLastActivityAt(monitorId) {
        return this._lastActivityByMonitorId.get(monitorId) ?? Date.now();
    }

    reconcileMonitors(monitorContexts) {
        const now = Date.now();
        const activeMonitorIds = new Set(monitorContexts.map(monitor => monitor.id));
        for (const monitorId of [...this._stateMachines.keys()]) {
            if (activeMonitorIds.has(monitorId)) continue;
            this._stateMachines.delete(monitorId);
            this._lastModes.delete(monitorId);
            this._lastKeepAwakeMinutes.delete(monitorId);
            this._lastActivityByMonitorId.delete(monitorId);
        }

        for (const monitor of monitorContexts) {
            if (!this._lastActivityByMonitorId.has(monitor.id))
                this._lastActivityByMonitorId.set(monitor.id, now);
        }
    }

    syncMonitorSettings(snapshot, monitor) {
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
        return machine;
    }

    recordPointerActivity(monitorId, now = Date.now()) {
        this._lastActivityByMonitorId.set(monitorId, now);
    }

    removeMonitor(monitorId) {
        this._stateMachines.delete(monitorId);
        this._lastModes.delete(monitorId);
        this._lastKeepAwakeMinutes.delete(monitorId);
        this._lastActivityByMonitorId.delete(monitorId);
    }

    clear() {
        this._stateMachines.clear();
        this._lastModes.clear();
        this._lastKeepAwakeMinutes.clear();
        this._lastActivityByMonitorId.clear();
    }

    _getOrCreateMachine(monitorId) {
        let machine = this._stateMachines.get(monitorId);
        if (machine) return machine;

        machine = new StateMachine();
        this._stateMachines.set(monitorId, machine);
        return machine;
    }
}
