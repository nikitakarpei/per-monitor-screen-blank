import type {
    MonitorDisconnectedEvent,
    MonitorIdentityPersistence,
} from '../../../ports/index.js';
import type { Logger } from '../../../util/logger.js';

interface RemoveMonitorIdentityDeps {
    readonly identityStore: MonitorIdentityPersistence;
    readonly logger: Logger;
}

/**
 * Handles the 'monitor-disconnected' event by removing the monitor identity.
 */
export function removeMonitorIdentity(
    deps: RemoveMonitorIdentityDeps,
    payload: MonitorDisconnectedEvent['payload'],
): void {
    deps.identityStore.remove(payload.monitorId);
}
