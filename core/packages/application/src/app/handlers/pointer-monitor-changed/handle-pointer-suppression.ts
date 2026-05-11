import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import type { LoggerPort } from '../../../util/logger.js';
import type { PointerMonitorChangedEvent } from '../../../app/ports/platform-events.js';
import type { GeneralSettings } from '../../../app/ports/general-settings.js';
import type { ProfileSettings } from '../../../app/ports/profile-settings.js';

interface HandlePointerMonitorChangedDeps {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    logger: LoggerPort;
    generalSettings: GeneralSettings;
    profileSettings: ProfileSettings;
}

/**
 * Handles the 'pointer-monitor-changed' event by canceling the auto-black deadline for the current monitor and scheduling it for the previous monitor.
 */
export function handlePointerSuppression(
    deps: HandlePointerMonitorChangedDeps,
    payload: PointerMonitorChangedEvent['payload'],
): void {
    if (!deps.generalSettings.getDisableAutoTimerOnPointerMonitor()) {
        return;
    }

    const currentMonitor = deps.monitorRegistry.get(payload.monitorId);
    if (
        currentMonitor.state === 'AutoAwake' ||
        currentMonitor.state === 'AutoBlack'
    ) {
        void deps.monitorRegistry.transitionState(
            payload.monitorId,
            'AutoPaused',
            'pointer-monitor-changed',
        );
    }

    if (payload.previousMonitorId !== undefined) {
        const previousMonitor = deps.monitorRegistry.get(
            payload.previousMonitorId,
        );
        if (previousMonitor.state === 'AutoPaused') {
            void deps.monitorRegistry.transitionState(
                payload.previousMonitorId,
                'AutoAwake',
                'pointer-monitor-changed',
            );
        }
    }
}
