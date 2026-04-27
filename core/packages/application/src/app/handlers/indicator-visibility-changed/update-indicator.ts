import { IndicatorVisibilityChangedEvent } from '../../../app/ports/platform-events.js';
import { QuickSettings } from '../../../app/ports/settings.js';
import { LoggerPort } from '../../../util/logger.js';

interface UpdateIndicatorDeps {
    indicatorControls: QuickSettings;
    logger: LoggerPort;
}

/**
 * Handles the 'indicator-visibility-changed' event by updating the indicator visibility.
 */
export function updateIndicator(
    deps: UpdateIndicatorDeps,
    payload: IndicatorVisibilityChangedEvent['payload'],
): void {
    deps.indicatorControls.visible = payload.visible;
    deps.logger.info(
        `indicator-visibility-changed: updated indicator visibility (visible=${payload.visible})`,
    );
}
