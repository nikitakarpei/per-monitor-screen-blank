import { buildMonitorLabel } from '../../../domain/monitor-identity.js';
import type { MonitorIdentityPersistence } from '../../../ports/index.js';
import type { Logger } from '../../../util/logger.js';

interface PersistMonitorIdentityDeps {
    readonly identityStore: MonitorIdentityPersistence;
    readonly logger: Logger;
}

/**
 * Handles the 'monitor-connected' event by persisting the monitor identity.
 */
export function persistMonitorIdentity(
    deps: PersistMonitorIdentityDeps,
    payload: {
        monitorId: string;
        connector: string;
        vendor?: string;
        product?: string;
    },
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
