import { buildMonitorLabel } from '../../../domain/monitor-identity.js';
import { MonitorIdentityStore } from '../../../app/ports/monitors.js';
import { Logger } from '../../../util/logger.js';
import { PhysicalMonitorInfo } from '../../../domain/types.js';

type PersistMonitorIdentityPayload = {
    monitorId: string;
    physicalMonitors: readonly PhysicalMonitorInfo[];
};

interface PersistMonitorIdentityDeps {
    readonly identityStore: MonitorIdentityStore;
    readonly logger: Logger;
}

export function persistMonitorIdentity(
    deps: PersistMonitorIdentityDeps,
    payload: PersistMonitorIdentityPayload,
): void {
    const label = buildMonitorLabel(payload.physicalMonitors);
    deps.identityStore.upsert({
        monitorId: payload.monitorId,
        label,
    });
    deps.logger.info(`monitor identity persisted: ${payload.monitorId}`);
}
