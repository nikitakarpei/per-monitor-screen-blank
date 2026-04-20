import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type {
    SettingsGateway,
    PointerPositionChangedEvent,
} from '../../../ports/index.js';
import type { DeadlineScheduler } from '../../../domain/ports-domain.js';
import type { Logger } from '../../../util/logger.js';

type WakeFromAutoBlackOnPointerDeps = {
    monitorRegistry: MonitorRegistry;
    settingsGateway: SettingsGateway;
    deadlineScheduler: DeadlineScheduler;
    logger: Logger;
};

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
