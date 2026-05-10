import { MonitorRegistry } from '../../services/monitor-registry.js';
import { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import { type LoggerPort } from '../../../util/logger.js';
import { MonitorDisconnectedEvent } from '../../../app/ports/platform-events.js';
import { MonitorIdentityStore } from '../../ports/monitors.js';
import { Overlay } from '../../ports/overlay.js';

interface TeardownMonitorDeps {
    monitorRegistry: MonitorRegistry;
    deadlineScheduler: DeadlineScheduler;
    monitorIdentityStore: MonitorIdentityStore;
    overlay: Overlay;
    logger: LoggerPort;
}

export function teardownMonitor(
    deps: TeardownMonitorDeps,
    payload: MonitorDisconnectedEvent['payload'],
): void {
    const monitor = deps.monitorRegistry.get(payload.monitorId);
    if (monitor.state === 'AutoBlack') {
        deps.overlay.hideForMonitor(payload.monitorId);
    }
    deps.deadlineScheduler.cancelMonitor(payload.monitorId);
    deps.monitorIdentityStore.remove(payload.monitorId);
    deps.monitorRegistry.remove(payload.monitorId);
    deps.logger.info(
        `teardown-monitor: monitor removed (id=${payload.monitorId})`,
    );
}
