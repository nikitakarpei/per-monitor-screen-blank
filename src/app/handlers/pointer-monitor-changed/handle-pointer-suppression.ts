import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type { DeadlineScheduler } from '../../../domain/ports-domain.js';
import type { Logger } from '../../../util/logger.js';
import type {
    SettingsGateway,
    PointerMonitorChangedEvent,
} from '../../../ports/index.js';

type HandlePointerMonitorChangedDeps = {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    logger: Logger;
    settingsGateway: SettingsGateway;
};

/**
 * Handles the 'pointer-monitor-changed' event by canceling the auto-black deadline for the current monitor and scheduling it for the previous monitor.
 */
export function handlePointerSuppression(
    deps: HandlePointerMonitorChangedDeps,
    payload: PointerMonitorChangedEvent['payload'],
): void {
    if (deps.settingsGateway.shouldMonitorAutoBlackWhenFocused()) {
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

    if (payload.previousMonitorId) {
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
