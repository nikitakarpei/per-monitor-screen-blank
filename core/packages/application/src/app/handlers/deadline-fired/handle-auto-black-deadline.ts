import { MonitorRegistry } from '../../services/monitor-registry.js';
import { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import { DEADLINE_KEYS } from '@pmsb/domain';
import { type LoggerPort } from '../../../util/logger.js';
import { AppEventBus } from '../../services/app-event-bus.js';
import { DeadlineFiredEvent } from '../../ports/platform-events.js';

interface HandleAutoBlackDeadlineDeps {
    logger: LoggerPort;
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    bus: AppEventBus;
}

/**
 * Handles the 'auto-black-deadline-fired' event by transitioning the monitor to AutoBlack state.
 */
export function handleAutoBlackDeadline(
    deps: HandleAutoBlackDeadlineDeps,
    payload: DeadlineFiredEvent['payload'],
): void {
    if (payload.deadlineKey !== DEADLINE_KEYS.autoBlack) {
        return;
    }

    deps.logger.info(
        `auto-black deadline fired: monitorId=${payload.monitorId}`,
    );

    const entity = deps.monitorRegistry.get(payload.monitorId);

    if (entity.state !== 'AutoAwake') {
        deps.logger.info(
            `auto-black deadline skipped: stale deadline | monitorId=${payload.monitorId} state=${entity.state}`,
        );
        return;
    }

    void deps.monitorRegistry.transitionState(
        payload.monitorId,
        'AutoBlack',
        'auto-deadline',
    );
}
