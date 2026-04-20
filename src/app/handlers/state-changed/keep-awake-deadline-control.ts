import { DEADLINE_KEYS } from '../../../domain/deadline-keys';
import { DeadlineScheduler } from '../../../domain/ports-domain';
import { SettingsGateway } from '../../../ports';
import { LoggerPort } from '../../../util/logger';
import { StateChangedEvent } from '../../services/app-event-bus';

type KeepAwakeDeadlineControlDeps = {
    deadlineScheduler: DeadlineScheduler;
    settingsGateway: SettingsGateway;
    logger: LoggerPort;
};

export function keepAwakeDeadlineControl(
    deps: KeepAwakeDeadlineControlDeps,
    payload: StateChangedEvent['payload'],
): void {
    if (payload.current === 'KeepAwake') {
        deps.deadlineScheduler.cancelMonitor(payload.monitorId);
        const deadlineMs =
            Date.now() + deps.settingsGateway.getKeepAwakeMinutes() * 60 * 1000;
        deps.deadlineScheduler.schedule(
            DEADLINE_KEYS.keepAwakeExpiry,
            payload.monitorId,
            deadlineMs,
        );
        return;
    }

    if (payload.previous === 'KeepAwake') {
        deps.deadlineScheduler.cancel(
            DEADLINE_KEYS.keepAwakeExpiry,
            payload.monitorId,
        );
    }
}
