import { MonitorDisconnectedEvent } from '../../../app/ports/platform-events.js';
import { MonitorIdentityStore } from '../../../app/ports/monitors.js';
import { Logger } from '../../../util/logger.js';

interface RemoveMonitorIdentityDeps {
    readonly identityStore: MonitorIdentityStore;
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
