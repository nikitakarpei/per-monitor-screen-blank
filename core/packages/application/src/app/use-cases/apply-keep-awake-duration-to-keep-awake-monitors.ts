import { DEADLINE_KEYS } from '@pmsb/domain';
import { type LoggerPort } from '../../util/logger.js';
import { type MonitorRegistry } from '../services/monitor-registry.js';
import { type DeadlineScheduler } from '../ports/scheduler.js';

export interface ApplyKeepAwakeDurationToKeepAwakeMonitorsDeps {
    readonly monitorRegistry: MonitorRegistry;
    readonly deadlineScheduler: DeadlineScheduler;
    readonly logger: LoggerPort;
}

export function applyKeepAwakeDurationToKeepAwakeMonitors(
    deps: ApplyKeepAwakeDurationToKeepAwakeMonitorsDeps,
    minutes: number,
): void {
    const durationMs = minutes * 60 * 1000;
    const now = Date.now();

    for (const entity of deps.monitorRegistry.getAll()) {
        if (entity.state !== 'KeepAwake') continue;

        deps.deadlineScheduler.cancel(DEADLINE_KEYS.keepAwakeExpiry, entity.id);

        const deadlineMs = now + durationMs;
        deps.deadlineScheduler.schedule(
            DEADLINE_KEYS.keepAwakeExpiry,
            entity.id,
            deadlineMs,
        );

        deps.logger.info(
            `keep-awake-duration-changed: rescheduled keep-awake expiry deadline (monitorId=${entity.id}, deadlineMs=${deadlineMs})`,
        );
    }
}
