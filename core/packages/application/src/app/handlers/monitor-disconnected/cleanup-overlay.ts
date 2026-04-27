import { MonitorDisconnectedEvent } from '../../../app/ports/platform-events.js';
import { Overlay } from '../../../app/ports/overlay.js';
import { LoggerPort } from '../../../util/logger.js';

interface CleanupOverlayDeps {
    readonly overlay: Overlay;
    readonly logger: LoggerPort;
}

/**
 * Handles the 'monitor-disconnected' event by cleaning up the overlay.
 */
export function cleanupOverlay(
    deps: CleanupOverlayDeps,
    payload: MonitorDisconnectedEvent['payload'],
): void {
    deps.overlay.hideForMonitor(payload.monitorId);
    deps.logger.info(
        `cleanup-overlay: cleaning up overlay for monitorId: ${payload.monitorId}`,
    );
}
