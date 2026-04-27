import { MonitorRegistry } from '../../services/monitor-registry.js';
import { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import { DEADLINE_KEYS } from '@pmsb/domain';
import { KeepAwakeDurationChangedEvent } from '../../../app/ports/platform-events.js';
import { LoggerPort } from '../../../util/logger.js';

interface RescheduleKeepAwakeDeadlinesDeps {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    logger: LoggerPort;
}

/**
 * Restarts keep-awake expiry timers for monitors in `keep-awake` mode with the new duration.
 */
export function rescheduleKeepAwakeDeadlines(
    deps: RescheduleKeepAwakeDeadlinesDeps,
    payload: KeepAwakeDurationChangedEvent['payload'],
): void {
    const durationMs = payload.minutes * 60 * 1000;
    const now = Date.now();

    for (const entity of deps.monitorRegistry.getAll()) {
        if (entity.state !== 'KeepAwake') continue;

        deps.deadlineScheduler.cancel(DEADLINE_KEYS.keepAwakeExpiry, entity.id);

        const deadlineMs = now + durationMs;
        deps.deadlineScheduler.schedule(
            DEADLINE_KEYS.keepAwakeExpiry,
            entity.id,
            deadlineMs,
        );

        deps.logger.info(
            `keep-awake-duration-changed: rescheduled keep-awake expiry deadline (monitorId=${entity.id}, deadlineMs=${deadlineMs})`,
        );
    }
}
