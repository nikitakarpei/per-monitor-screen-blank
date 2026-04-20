import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type { DeadlineScheduler } from '../../../domain/ports-domain.js';
import { DEADLINE_KEYS } from '../../../domain/deadline-keys.js';
import type { Logger } from '../../../util/logger.js';

type RescheduleAutoBlackDeadlinesDeps = {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    logger: Logger;
};

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
