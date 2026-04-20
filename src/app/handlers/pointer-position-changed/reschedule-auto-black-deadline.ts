import { DEADLINE_KEYS } from '../../../domain/deadline-keys.js';
import type { DeadlineScheduler } from '../../../domain/ports-domain.js';
import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type {
    SettingsGateway,
    PointerPositionChangedEvent,
} from '../../../ports/index.js';
import type { Logger } from '../../../util/logger.js';

type RescheduleAutoBlackDeadlineDeps = {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    settingsGateway: SettingsGateway;
    logger: Logger;
};

/**
 * Reschedules the auto-black deadline for the pointer monitor based on the pointer position and the idle timeout.
 */
export function rescheduleAutoBlackDeadline(
    deps: RescheduleAutoBlackDeadlineDeps,
    payload: PointerPositionChangedEvent['payload'],
): void {
    const entity = deps.monitorRegistry.get(payload.monitorId);
    if (entity.state !== 'AutoAwake') {
        return;
    }

    deps.deadlineScheduler.cancel(DEADLINE_KEYS.autoBlack, entity.id);

    const deadlineMs =
        Date.now() + deps.settingsGateway.getIdleTimeoutSeconds() * 1000;
    deps.deadlineScheduler.schedule(
        DEADLINE_KEYS.autoBlack,
        entity.id,
        deadlineMs,
    );
}
