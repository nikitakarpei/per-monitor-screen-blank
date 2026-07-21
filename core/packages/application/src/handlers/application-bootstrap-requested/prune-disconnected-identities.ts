import type {
    ConnectedMonitorsQuery,
    MonitorIdentityStore,
} from '../../ports/monitors.js';

interface PruneDisconnectedIdentitiesDeps {
    readonly connectedMonitorsQuery: ConnectedMonitorsQuery;
    readonly monitorIdentityStore: MonitorIdentityStore;
}

/**
 * Prunes disconnected monitor identities on application startup.
 * Compares persisted monitor IDs against live connected monitors and removes
 * identities absent from the current topology.
 */
export function pruneDisconnectedIdentities(
    deps: PruneDisconnectedIdentitiesDeps,
    _payload: Record<string, never>,
): void {
    const connectedMonitors =
        deps.connectedMonitorsQuery.listConnectedMonitors();
    const currentMonitorIds = new Set(
        connectedMonitors.map((m) => m.monitorId),
    );
    const persistedIds = deps.monitorIdentityStore.listIds();
    const absentIds = persistedIds.filter((id) => !currentMonitorIds.has(id));
    for (const monitorId of absentIds) {
        deps.monitorIdentityStore.remove(monitorId);
    }
}
