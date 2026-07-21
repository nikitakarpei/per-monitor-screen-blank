import { buildMonitorLabel } from '@pmsb/domain';
import type { LogicalMonitorIdentity } from '@pmsb/domain';
import type { LoggerPort } from '../util/logger.js';
import type { MonitorIdentityStore } from '../ports/monitors.js';

export interface PersistMonitorIdentityDeps {
    readonly monitorIdentityStore: MonitorIdentityStore;
    readonly logger: LoggerPort;
}

export function persistMonitorIdentity(
    deps: PersistMonitorIdentityDeps,
    identity: LogicalMonitorIdentity,
): void {
    const label = buildMonitorLabel(identity.physicalMonitors);
    deps.monitorIdentityStore.upsert({
        monitorId: identity.monitorId,
        label,
    });
    deps.logger.info(`monitor identity persisted: ${identity.monitorId}`);
}
