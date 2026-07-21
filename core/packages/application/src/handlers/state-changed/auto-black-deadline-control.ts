import type { DeadlineScheduler } from '../../ports/scheduler';
import type { StateChangedEvent } from '../../app-events';
import type { LoggerPort } from '../../util/logger';
import type { GeneralSettings } from '../../ports/general-settings.js';
import { DEADLINE_KEYS } from '@pmsb/domain';
import type { FocusedMonitorService } from '../../services/focused-monitor-service';

interface AutoBlackDeadlineControlDeps {
    focusedMonitorService: FocusedMonitorService;
    deadlineScheduler: DeadlineScheduler;
    generalSettings: GeneralSettings;
    logger: LoggerPort;
}

/**
 * Handles the `state-changed` event and controls the auto-black deadline for the monitor.
 */
export function autoBlackDeadlineControl(
    deps: AutoBlackDeadlineControlDeps,
    payload: StateChangedEvent['payload'],
): void {
    if (payload.current === 'AutoAwake') {
        deps.deadlineScheduler.cancelMonitor(payload.monitorId);
        const deadlineMs =
            Date.now() + deps.generalSettings.getIdleTimeout() * 1000;
        deps.deadlineScheduler.schedule(
            DEADLINE_KEYS.autoBlack,
            payload.monitorId,
            deadlineMs,
        );
        return;
    }

    if (payload.previous === 'AutoAwake') {
        void deps.deadlineScheduler.tryCancel(
            DEADLINE_KEYS.autoBlack,
            payload.monitorId,
        );
    }
}
