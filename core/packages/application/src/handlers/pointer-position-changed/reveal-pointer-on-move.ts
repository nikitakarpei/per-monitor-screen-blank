import {
    DEADLINE_KEYS,
    POINTER_HIDE_DELAY_MS,
    shouldHidePointerOverMonitor,
} from '@pmsb/domain';
import type { GeneralSettings } from '../../ports/general-settings.js';
import type { PointerVisibility } from '../../ports/pointer-visibility.js';
import type { DeadlineScheduler } from '../../ports/scheduler.js';
import type { FocusedMonitorService } from '../../services/focused-monitor-service.js';
import type { LoggerPort } from '../../util/logger.js';

interface RevealPointerOnMoveDeps {
    focusedMonitorService: FocusedMonitorService;
    generalSettings: Pick<GeneralSettings, 'getDimIntensity'>;
    pointerVisibility: PointerVisibility;
    deadlineScheduler: DeadlineScheduler;
    logger: LoggerPort;
}

/**
 * Handles 'pointer-position-changed' by showing the pointer and, while it is
 * on a fully black monitor, (re)scheduling the deadline that hides it again
 * once the pointer has rested for {@link POINTER_HIDE_DELAY_MS}.
 *
 * Reads the focused monitor rather than the payload: the pointer source also
 * reports the previous monitor on a monitor change, and after a disconnect it
 * may skip 'pointer-monitor-changed' but still reports the current monitor here.
 */
export function revealPointerOnMove(deps: RevealPointerOnMoveDeps): void {
    deps.pointerVisibility.setHidden(false);

    const focused = deps.focusedMonitorService.getFocusedMonitor();
    if (!focused) {
        deps.logger.info(
            'reveal-pointer-on-move: pointer is not on a managed monitor, not scheduling pointer hide',
        );
        return;
    }
    if (
        !shouldHidePointerOverMonitor(
            focused.state,
            deps.generalSettings.getDimIntensity(),
        )
    ) {
        return;
    }

    deps.deadlineScheduler.schedule(
        DEADLINE_KEYS.pointerHide,
        focused.id,
        Date.now() + POINTER_HIDE_DELAY_MS,
    );
}
