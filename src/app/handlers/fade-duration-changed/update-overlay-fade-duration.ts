import type { Overlay } from '../../../ports/index.js';

type UpdateOverlayFadeDurationDeps = {
    overlay: Overlay;
};

/**
 * Handles the 'fade-duration-changed' event by updating the overlay fade duration.
 */
export function updateOverlayFadeDuration(
    deps: UpdateOverlayFadeDurationDeps,
    payload: { milliseconds: number },
): void {
    deps.overlay.setFadeDuration(payload.milliseconds);
}
