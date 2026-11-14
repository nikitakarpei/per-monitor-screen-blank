import type { Overlay } from '../../ports/overlay.js';
import type { LoggerPort } from '../../util/logger.js';
import { isBlackMonitorState } from '@pmsb/domain';
import type { StateChangedEvent } from '../../app-events.js';

interface MonitorOverlayDeps {
    overlay: Overlay;
    logger: LoggerPort;
}

export function handleOverlaySyncStateChanged(
    deps: MonitorOverlayDeps,
    payload: StateChangedEvent['payload'],
): void {
    const wasBlack = payload.previous
        ? isBlackMonitorState(payload.previous)
        : false;
    const isNowBlack = isBlackMonitorState(payload.current);

    if (wasBlack === isNowBlack) {
        return;
    }

    if (!wasBlack && isNowBlack) {
        deps.overlay.showForMonitor(payload.monitorId);
    } else {
        deps.overlay.hideForMonitor(payload.monitorId);
    }
}
