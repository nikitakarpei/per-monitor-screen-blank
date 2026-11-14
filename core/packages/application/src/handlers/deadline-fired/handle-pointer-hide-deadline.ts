import { DEADLINE_KEYS } from '@pmsb/domain';
import type { DeadlineFiredEvent } from '../../ports/platform-events.js';
import { syncPointerVisibility } from '../../use-cases/sync-pointer-visibility.js';
import type { SyncPointerVisibilityDeps } from '../../use-cases/sync-pointer-visibility.js';

/**
 * Handles the pointer-hide deadline by re-applying the resting-pointer rule,
 * provided the pointer is still on the monitor the deadline was set for.
 */
export function handlePointerHideDeadline(
    deps: SyncPointerVisibilityDeps,
    payload: DeadlineFiredEvent['payload'],
): void {
    if (payload.deadlineKey !== DEADLINE_KEYS.pointerHide) {
        return;
    }

    const focused = deps.focusedMonitorService.getFocusedMonitor();
    if (focused?.id !== payload.monitorId) {
        deps.logger.info(
            `pointer-hide deadline skipped: pointer left monitor | monitorId=${payload.monitorId}`,
        );
        return;
    }

    syncPointerVisibility(deps);
}
