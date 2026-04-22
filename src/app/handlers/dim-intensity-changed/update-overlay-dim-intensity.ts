import { Overlay } from '../../../app/ports/overlay.js';

interface UpdateOverlayDimIntensityDeps {
    overlay: Overlay;
}

/**
 * Handles the 'dim-intensity-changed' event by updating the overlay dim intensity.
 */
export function updateOverlayDimIntensity(
    deps: UpdateOverlayDimIntensityDeps,
    payload: { percent: number },
): void {
    deps.overlay.setDimIntensityPercent(payload.percent);
}
