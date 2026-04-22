import { MonitorRegistry } from '../../services/monitor-registry.js';
import { PointerPositionChangedEvent } from '../../../app/ports/platform-events.js';
import { SettingsGateway } from '../../../app/ports/settings.js';
import { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import { Logger } from '../../../util/logger.js';

interface WakeFromAutoBlackOnPointerDeps {
    monitorRegistry: MonitorRegistry;
    settingsGateway: SettingsGateway;
    deadlineScheduler: DeadlineScheduler;
    logger: Logger;
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
