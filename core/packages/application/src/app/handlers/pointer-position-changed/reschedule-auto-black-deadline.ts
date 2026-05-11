import { DEADLINE_KEYS } from '@pmsb/domain';
import type { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type { PointerPositionChangedEvent } from '../../../app/ports/platform-events.js';
import type { GeneralSettings } from '../../../app/ports/general-settings.js';
import type { LoggerPort } from '../../../util/logger.js';

interface RescheduleAutoBlackDeadlineDeps {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    generalSettings: GeneralSettings;
    logger: LoggerPort;
}

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
        Date.now() + deps.generalSettings.getIdleTimeout() * 1000;
    deps.deadlineScheduler.schedule(
        DEADLINE_KEYS.autoBlack,
        entity.id,
        deadlineMs,
    );
}
