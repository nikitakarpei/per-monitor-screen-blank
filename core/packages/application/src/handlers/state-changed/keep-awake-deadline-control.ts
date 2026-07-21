import { DEADLINE_KEYS } from '@pmsb/domain';
import type { DeadlineScheduler } from '../../ports/scheduler.js';
import type { GeneralSettings } from '../../ports/general-settings.js';
import type { LoggerPort } from '../../util/logger.js';
import type { StateChangedEvent } from '../../app-events.js';

interface KeepAwakeDeadlineControlDeps {
    deadlineScheduler: DeadlineScheduler;
    generalSettings: GeneralSettings;
    logger: LoggerPort;
}

export function keepAwakeDeadlineControl(
    deps: KeepAwakeDeadlineControlDeps,
    payload: StateChangedEvent['payload'],
): void {
    if (payload.current === 'KeepAwake') {
        deps.deadlineScheduler.cancelMonitor(payload.monitorId);
        const deadlineMs =
            Date.now() + deps.generalSettings.getKeepAwakeMinutes() * 60 * 1000;
        deps.deadlineScheduler.schedule(
            DEADLINE_KEYS.keepAwakeExpiry,
            payload.monitorId,
            deadlineMs,
        );
        return;
    }

    if (payload.previous === 'KeepAwake') {
        void deps.deadlineScheduler.tryCancel(
            DEADLINE_KEYS.keepAwakeExpiry,
            payload.monitorId,
        );
    }
}
