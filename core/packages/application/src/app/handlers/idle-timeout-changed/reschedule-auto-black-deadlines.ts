import { MonitorRegistry } from '../../services/monitor-registry.js';
import { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import { DEADLINE_KEYS } from '@pmsb/domain';
import { type LoggerPort } from '../../../util/logger.js';

interface RescheduleAutoBlackDeadlinesDeps {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    logger: LoggerPort;
}

/**
 * Handles the 'idle-timeout-changed' event by rescheduling the auto-black deadline for every monitor currently in AutoAwake state.
 */
export function rescheduleAutoBlackDeadlines(
    deps: RescheduleAutoBlackDeadlinesDeps,
    payload: { timeoutSeconds: number },
): void {
    for (const entity of deps.monitorRegistry.getAll()) {
        if (entity.state !== 'AutoAwake') continue;

        deps.deadlineScheduler.cancel(DEADLINE_KEYS.autoBlack, entity.id);

        const deadlineMs = Date.now() + payload.timeoutSeconds * 1000;
        deps.deadlineScheduler.schedule(
            DEADLINE_KEYS.autoBlack,
            entity.id,
            deadlineMs,
        );

        deps.logger.info(
            `idle-timeout-changed: rescheduled auto-black deadline (monitorId=${entity.id}, deadlineMs=${deadlineMs})`,
        );
    }
}
