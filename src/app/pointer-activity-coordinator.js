import { State } from '../shared/domain/state-machine.js';
import { logInfo } from '../shared/util/logger.js';

export class PointerActivityCoordinator {
    constructor({
        monitorStateManager,
        getMonitorByIndex,
        getMachine,
        rescheduleMonitor,
    }) {
        this._monitorStateManager = monitorStateManager;
        this._getMonitorByIndex = getMonitorByIndex;
        this._getMachine = getMachine;
        this._rescheduleMonitor = rescheduleMonitor;
    }

    handlePointerActivity(snapshot, activity) {
        this.reschedulePointerDeparture(snapshot, activity);
        const monitor = this._getMonitorByIndex(activity?.monitorIndex);
        const now = Date.now();

        if (!monitor) {
            if (this._monitorStateManager.getMonitorIds().length === 0) return;
            logInfo('pointer activity ignored: monitor not found', {
                monitorIndex: activity?.monitorIndex,
            });
            return;
        }

        if (monitor.mode !== 'auto') return;
        this._monitorStateManager.recordPointerActivity(monitor.id, now);
        const machine = this._getMachine(monitor.id);
        if (machine.state === State.AutoBlack) {
            machine.transition(State.AutoAwake, 'pointer-activity');
        }
        this._rescheduleMonitor(snapshot, monitor, machine);
    }

    reschedulePointerDeparture(snapshot, activity) {
        if (!snapshot?.disableAutoTimerOnPointerMonitor) {
            return;
        }

        const previousMonitorIndex = activity?.previousMonitorIndex;
        const currentMonitorIndex = activity?.monitorIndex;
        if (
            !Number.isInteger(previousMonitorIndex) ||
            previousMonitorIndex === currentMonitorIndex
        ) {
            return;
        }

        const previousMonitor = this._getMonitorByIndex(previousMonitorIndex);
        if (!previousMonitor) {
            if (this._monitorStateManager.getMonitorIds().length > 0) {
                logInfo(
                    'pointer departure reschedule skipped: previous monitor not found',
                    {
                        previousMonitorIndex,
                        currentMonitorIndex,
                    },
                );
            }
            return;
        }

        if (previousMonitor.mode !== 'auto') {
            return;
        }

        this._rescheduleMonitor(
            snapshot,
            previousMonitor,
            this._getMachine(previousMonitor.id),
        );
    }
}
