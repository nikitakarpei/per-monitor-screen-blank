import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type { PointerPositionChangedEvent } from '../../ports/platform-events.js';
import type { DeadlineScheduler } from '../../ports/scheduler.js';
import type { LoggerPort } from '../../util/logger.js';

interface WakeFromAutoBlackOnPointerDeps {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    logger: LoggerPort;
}

/** Handles the 'pointer-position-changed' event by waking the monitor from AutoBlack. */
export function wakeFromAutoBlackOnPointer(
    deps: WakeFromAutoBlackOnPointerDeps,
    payload: PointerPositionChangedEvent['payload'],
): void {
    const entity = deps.monitorRegistry.get(payload.monitorId);
    if (entity.state !== 'AutoBlack') {
        return;
    }

    void deps.monitorRegistry.transitionState(
        entity.id,
        'AutoAwake',
        'pointer-position-changed',
    );

    deps.logger.info(
        `pointer-position-changed: woke from AutoBlack | monitorId=${entity.id}`,
    );
}
