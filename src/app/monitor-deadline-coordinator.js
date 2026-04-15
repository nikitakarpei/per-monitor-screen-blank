import { State } from '../shared/domain/state-machine.js';
import { shouldAutoBlack } from '../shared/core/auto-black-policy.js';

export class MonitorDeadlineCoordinator {
    constructor({
        deadlineScheduler,
        pointerActivitySource,
        monitorStateManager,
    }) {
        this._deadlineScheduler = deadlineScheduler;
        this._pointerActivitySource = pointerActivitySource;
        this._monitorStateManager = monitorStateManager;
    }

    rescheduleMonitor(snapshot, monitor, machine) {
        if (!monitor || !snapshot) return;
        if (
            monitor.mode === 'keep-awake' &&
            machine.keepAwakeUntil !== undefined
        ) {
            this._deadlineScheduler.schedule(
                'keep-awake-expiry',
                monitor.id,
                machine.keepAwakeUntil,
            );
            this.cancelAutoDeadline(monitor.id);
            return;
        }

        this.cancelKeepAwakeDeadline(monitor.id);
        if (monitor.mode !== 'auto') {
            this.cancelAutoDeadline(monitor.id);
            return;
        }

        const lastActivityAt = this._monitorStateManager.getLastActivityAt(
            monitor.id,
        );
        const targetIdleTimeMs = Date.now() - lastActivityAt;
        const isPointerOnTargetMonitor =
            this._pointerActivitySource.getPointerSnapshot().monitorIndex ===
            monitor.index;
        if (
            snapshot.disableAutoTimerOnPointerMonitor &&
            isPointerOnTargetMonitor
        ) {
            if (machine.state === State.AutoBlack) {
                machine.transition(State.AutoAwake, 'auto-reschedule');
            }
            this.cancelAutoDeadline(monitor.id);
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
            this.cancelAutoDeadline(monitor.id);
            return;
        }

        if (machine.state !== State.AutoBlack) {
            machine.transition(State.AutoAwake, 'auto-reschedule');
        }
        const deadlineMs =
            lastActivityAt + Math.max(0, snapshot.idleTimeoutSeconds) * 1000;
        this._deadlineScheduler.schedule('auto-black', monitor.id, deadlineMs);
    }

    cancelAutoDeadline(monitorId) {
        this._deadlineScheduler.cancel('auto-black', monitorId);
    }

    cancelKeepAwakeDeadline(monitorId) {
        this._deadlineScheduler.cancel('keep-awake-expiry', monitorId);
    }
}
