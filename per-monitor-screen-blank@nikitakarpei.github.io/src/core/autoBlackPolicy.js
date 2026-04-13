export function shouldAutoBlack({
    targetIdleTimeMs,
    idleTimeoutSeconds,
    wakeOnPointerEntry,
    isCurrentlyAutoBlack,
    isPointerOnTargetMonitor,
}) {
    const idleThresholdMs = Math.max(0, idleTimeoutSeconds) * 1000;
    if (targetIdleTimeMs >= idleThresholdMs)
        return true;

    return isCurrentlyAutoBlack && isPointerOnTargetMonitor && !wakeOnPointerEntry;
}
