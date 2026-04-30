import { DeadlineScheduler } from '../../../app/ports/scheduler';
import { StateChangedEvent } from '../../app-events';
import { LoggerPort } from '../../../util/logger';
import { GeneralSettings } from '../../../app/ports/general-settings.js';
import { DEADLINE_KEYS } from '@pmsb/domain';
import { FocusedMonitorService } from '../../services/focused-monitor-service';

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
        deps.deadlineScheduler.cancel(
            DEADLINE_KEYS.autoBlack,
            payload.monitorId,
        );
    }
}
