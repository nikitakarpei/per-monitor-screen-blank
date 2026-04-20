import type { Overlay } from '../../../ports/index.js';
import type { Logger } from '../../../util/logger.js';
import type { MonitorState } from '../../../domain/monitor-state.js';
import { StateChangedEvent } from '../../services/app-event-bus.js';

type MonitorOverlayDeps = {
    overlay: Overlay;
    logger: Logger;
};

export function handleOverlaySyncStateChanged(
    deps: MonitorOverlayDeps,
    payload: StateChangedEvent['payload'],
): void {
    const wasBlack = payload.previous ? isBlackState(payload.previous) : false;
    const isNowBlack = isBlackState(payload.current);

    if (wasBlack === isNowBlack) {
        return;
    }

    if (!wasBlack && isNowBlack) {
        deps.overlay.showForMonitor(payload.monitorId);
    } else {
        deps.overlay.hideForMonitor(payload.monitorId);
    }
}

function isBlackState(state: MonitorState): boolean {
    return state === 'AutoBlack' || state === 'ManualBlack';
}
