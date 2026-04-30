import { DEADLINE_KEYS } from '@pmsb/domain';
import { type LoggerPort } from '../../util/logger.js';
import { type MonitorRegistry } from '../services/monitor-registry.js';
import { type DeadlineScheduler } from '../ports/scheduler.js';

export interface ApplyIdleTimeoutToAutoAwakeMonitorsDeps {
    readonly monitorRegistry: MonitorRegistry;
    readonly deadlineScheduler: DeadlineScheduler;
    readonly logger: LoggerPort;
}

export function applyIdleTimeoutToAutoAwakeMonitors(
    deps: ApplyIdleTimeoutToAutoAwakeMonitorsDeps,
    timeoutSeconds: number,
): void {
    for (const entity of deps.monitorRegistry.getAll()) {
        if (entity.state !== 'AutoAwake') continue;

        deps.deadlineScheduler.cancel(DEADLINE_KEYS.autoBlack, entity.id);

        const deadlineMs = Date.now() + timeoutSeconds * 1000;
        deps.deadlineScheduler.schedule(
            DEADLINE_KEYS.autoBlack,
            entity.id,
            deadlineMs,
        );

        deps.logger.info(
            `idle-timeout-changed: rescheduled auto-black deadline (monitorId=${entity.id}, deadlineMs=${deadlineMs})`,
        );
    }
}
