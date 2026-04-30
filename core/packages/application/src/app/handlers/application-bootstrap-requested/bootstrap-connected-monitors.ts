import {
    setupConnectedMonitor,
    type SetupConnectedMonitorDeps,
} from '../../use-cases/setup-connected-monitor.js';
import { type ConnectedMonitorsQuery } from '../../ports/monitors.js';
import { type LoggerPort } from '../../../util/logger.js';

interface BootstrapConnectedMonitorsDeps extends SetupConnectedMonitorDeps {
    readonly connectedMonitorsQuery: ConnectedMonitorsQuery;
    readonly logger: LoggerPort;
}

/**
 * Bootstraps connected monitors on application startup.
 * Reads current connected monitors from connected monitors query and invokes
 * the connected monitor setup use case for each monitor.
 */
export function bootstrapConnectedMonitors(
    deps: BootstrapConnectedMonitorsDeps,
    _payload: Record<string, never>,
): void {
    const connectedMonitors =
        deps.connectedMonitorsQuery.listConnectedMonitors();
    for (const monitor of connectedMonitors) {
        setupConnectedMonitor(deps, monitor.monitorId);
    }
}
