import { isBlackMonitorState, isFullyBlackDimIntensity } from '@pmsb/domain';
import type { GeneralSettings } from '../ports/general-settings.js';
import type { PointerVisibility } from '../ports/pointer-visibility.js';
import type { FocusedMonitorService } from '../services/focused-monitor-service.js';
import type { LoggerPort } from '../util/logger.js';

export interface SyncPointerVisibilityDeps {
    readonly focusedMonitorService: FocusedMonitorService;
    readonly generalSettings: Pick<GeneralSettings, 'getDimIntensity'>;
    readonly pointerVisibility: PointerVisibility;
    readonly logger: LoggerPort;
}

/**
 * Hides the pointer while it rests on a fully blacked-out monitor and
 * restores it otherwise. Dimmed (not fully black) monitors keep it visible.
 */
export function syncPointerVisibility(deps: SyncPointerVisibilityDeps): void {
    const focused = deps.focusedMonitorService.getFocusedMonitor();
    if (!focused) {
        deps.logger.info(
            'sync-pointer-visibility: pointer is not on a managed monitor, keeping pointer visible',
        );
        deps.pointerVisibility.setHidden(false);
        return;
    }

    const hidden =
        focused.state !== undefined &&
        isBlackMonitorState(focused.state) &&
        isFullyBlackDimIntensity(deps.generalSettings.getDimIntensity());

    deps.pointerVisibility.setHidden(hidden);
}
