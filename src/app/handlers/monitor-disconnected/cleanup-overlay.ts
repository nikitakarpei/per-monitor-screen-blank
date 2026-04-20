import type {
    MonitorDisconnectedEvent,
    Overlay,
} from '../../../ports/index.js';
import type { LoggerPort } from '../../../util/logger.js';

interface OverlayCleanupDeps {
    readonly overlay: Overlay;
    readonly logger: LoggerPort;
}

/**
 * Handles the 'monitor-disconnected' event by cleaning up the overlay.
 */
export function cleanupOverlay(
    deps: OverlayCleanupDeps,
    payload: MonitorDisconnectedEvent['payload'],
): void {
    deps.overlay.hideForMonitor(payload.monitorId);
    deps.logger.info(
        `cleanup-overlay: cleaning up overlay for monitorId: ${payload.monitorId}`,
    );
}
