import type {
    IndicatorVisibilityChangedEvent,
    QuickSettings,
} from '../../../ports/index.js';
import { LoggerPort } from '../../../util/logger.js';

type UpdateIndicatorDeps = {
    indicatorControls: QuickSettings;
    logger: LoggerPort;
};

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
