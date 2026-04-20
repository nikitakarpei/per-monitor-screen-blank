export function normalizeFadeDurationMs(
    durationMs: number,
    _fallback: number,
): number {
    if (!Number.isFinite(durationMs)) {
        throw new RangeError(
            `Cannot normalize fade duration: ${durationMs} is not a finite number`,
        );
    }
    const clamped = Math.max(0, Math.floor(durationMs));
    return clamped;
}
