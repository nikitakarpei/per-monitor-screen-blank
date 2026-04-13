import { shouldReactToPointerActivity } from '../domain/activityPolicy.js';

export function shouldAutoBlack({
    targetIdleTimeMs,
    idleTimeoutSeconds,
    wakeOnPointerEntry,
    isCurrentlyAutoBlack,
    isPointerOnTargetMonitor,
}) {
    return shouldReactToPointerActivity(
        targetIdleTimeMs,
        Math.max(0, idleTimeoutSeconds) * 1000,
        {
            wakeOnPointerEntry,
            isCurrentlyAutoBlack,
            isPointerOnTargetMonitor,
        }
    );
}
