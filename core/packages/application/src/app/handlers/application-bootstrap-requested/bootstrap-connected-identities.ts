import {
    persistMonitorIdentity,
    type PersistMonitorIdentityDeps,
} from '../../use-cases/persist-monitor-identity.js';
import { type ConnectedMonitorsQuery } from '../../ports/monitors.js';

interface BootstrapConnectedIdentitiesDeps extends PersistMonitorIdentityDeps {
    readonly connectedMonitorsQuery: ConnectedMonitorsQuery;
}

/**
 * Bootstraps connected monitor identity persistence on application startup.
 * Reads current connected monitors and invokes identity persistence for each.
 */
export function bootstrapConnectedIdentities(
    deps: BootstrapConnectedIdentitiesDeps,
    _payload: Record<string, never>,
): void {
    const connectedMonitors =
        deps.connectedMonitorsQuery.listConnectedMonitors();
    for (const monitor of connectedMonitors) {
        persistMonitorIdentity(deps, monitor);
    }
}
