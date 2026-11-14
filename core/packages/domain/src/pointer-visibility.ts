import { isFullyBlackDimIntensity } from './dim-intensity.js';
import { isBlackMonitorState } from './monitor-state.js';
import type { MonitorState } from './monitor-state.js';

/** How long the pointer stays visible on a fully black monitor after it last moved. */
export const POINTER_HIDE_DELAY_MS = 2000;

/*
 * Check if a resting pointer should be hidden over a monitor: only when the
 * monitor is blanked and the overlay fully blacks it out (not merely dims it).
 */
export function shouldHidePointerOverMonitor(
    state: MonitorState | undefined,
    dimIntensityPercent: number,
): boolean {
    return (
        state !== undefined &&
        isBlackMonitorState(state) &&
        isFullyBlackDimIntensity(dimIntensityPercent)
    );
}
