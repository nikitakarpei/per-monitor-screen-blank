import { DEADLINE_KEYS, isBlackMonitorState } from '@pmsb/domain';
import type { StateChangedEvent } from '../../app-events.js';
import type { DeadlineScheduler } from '../../ports/scheduler.js';
import { syncPointerVisibility } from '../../use-cases/sync-pointer-visibility.js';
import type { SyncPointerVisibilityDeps } from '../../use-cases/sync-pointer-visibility.js';

interface PointerVisibilityControlDeps extends SyncPointerVisibilityDeps {
    readonly deadlineScheduler: DeadlineScheduler;
}

/**
 * Cancels a pending pointer-hide deadline when its monitor wakes, and
 * re-applies the resting-pointer rule when the pointer's own monitor changes
 * state. Changes on other monitors leave the pointer (and its grace period)
 * untouched.
 */
export function pointerVisibilityControl(
    deps: PointerVisibilityControlDeps,
    payload: StateChangedEvent['payload'],
): void {
    const wasBlack =
        payload.previous !== undefined && isBlackMonitorState(payload.previous);
    if (wasBlack && !isBlackMonitorState(payload.current)) {
        void deps.deadlineScheduler.tryCancel(
            DEADLINE_KEYS.pointerHide,
            payload.monitorId,
        );
    }

    if (
        deps.focusedMonitorService.getFocusedMonitor()?.id !== payload.monitorId
    ) {
        return;
    }

    syncPointerVisibility(deps);
}
