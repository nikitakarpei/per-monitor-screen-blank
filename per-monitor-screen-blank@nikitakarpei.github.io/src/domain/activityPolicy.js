export function shouldReactToPointerActivity(
    targetIdleTimeMs,
    idleThresholdMs = 0,
    { wakeOnPointerEntry = true, isCurrentlyAutoBlack = false, isPointerOnTargetMonitor = false } = {}
) {
    if (targetIdleTimeMs >= idleThresholdMs) return true;

    return isCurrentlyAutoBlack && isPointerOnTargetMonitor && !wakeOnPointerEntry;
}
