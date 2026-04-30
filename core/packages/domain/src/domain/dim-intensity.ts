export function normalizeDimIntensityPercent(percent: number): number {
    if (!Number.isFinite(percent)) {
        throw new RangeError(
            `Cannot normalize dim intensity: ${percent} is not a finite number`,
        );
    }
    const clamped = Math.max(0, Math.min(100, Math.floor(percent)));
    return clamped;
}

export function dimIntensityPercentToOpacity(percent: number): number {
    return Math.round(((percent as number) * 255) / 100);
}
