import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type { DeadlineScheduler } from '../../../domain/ports-domain.js';
import type { Logger } from '../../../util/logger.js';
import { MonitorDisconnectedEvent } from '../../../ports/index.js';

interface TeardownMonitorDeps {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    logger: Logger;
}

/**
 * Tears down a monitor when it's disconnected.
 * 1. Cancels all deadlines for the monitor
 * 2. Cleans up the state machine
 * 3. Removes the entry from the MonitorRegistry
 */
export function teardownMonitor(
    deps: TeardownMonitorDeps,
    payload: MonitorDisconnectedEvent['payload'],
): void {
    deps.deadlineScheduler.cancelMonitor(payload.monitorId);
    deps.monitorRegistry.remove(payload.monitorId);
    deps.logger.info(
        `teardown-monitor: monitor removed (id=${payload.monitorId})`,
    );
}
