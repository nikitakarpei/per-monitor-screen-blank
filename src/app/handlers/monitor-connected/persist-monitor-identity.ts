import { buildMonitorLabel } from '../../../domain/monitor-identity.js';
import { MonitorIdentityStore } from '../../../app/ports/monitors.js';
import { Logger } from '../../../util/logger.js';

type PersistMonitorIdentityPayload = {
    monitorId: string;
    connector: string;
    vendor?: string;
    product?: string;
};

interface PersistMonitorIdentityDeps {
    readonly identityStore: MonitorIdentityStore;
    readonly logger: Logger;
}

/**
 * Handles the 'monitor-connected' event by persisting the monitor identity.
 */
export function persistMonitorIdentity(
    deps: PersistMonitorIdentityDeps,
    payload: PersistMonitorIdentityPayload,
): void {
    const label = buildMonitorLabel({
        vendor: payload.vendor,
        product: payload.product,
        connector: payload.connector,
    });
    deps.identityStore.upsert({
        monitorId: payload.monitorId,
        label,
    });
    deps.logger.info(`monitor identity persisted: ${payload.monitorId}`);
}
