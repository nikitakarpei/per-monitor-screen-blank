import { DeadlineScheduler } from '../../../app/ports/scheduler';
import { StateChangedEvent } from '../../app-events';
import { LoggerPort } from '../../../util/logger';
import { SettingsGateway } from '../../../app/ports/settings.js';
import { DEADLINE_KEYS } from '@pmsb/domain';
import { FocusedMonitorService } from '../../services/focused-monitor-service';

interface AutoBlackDeadlineControlDeps {
    focusedMonitorService: FocusedMonitorService;
    deadlineScheduler: DeadlineScheduler;
    settingsGateway: SettingsGateway;
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
            Date.now() + deps.settingsGateway.getIdleTimeoutSeconds() * 1000;
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
