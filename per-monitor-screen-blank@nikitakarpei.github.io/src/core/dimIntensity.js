import { DEFAULTS } from './defaults.js';

export function normalizeDimIntensityPercent(percent, fallback = DEFAULTS.dimIntensityPercent) {
    const normalized = Number.isFinite(percent) ? percent : fallback;
    return Math.max(0, Math.min(100, Math.floor(normalized)));
}

export function dimIntensityPercentToOpacity(percent) {
    return Math.round(normalizeDimIntensityPercent(percent) * 255 / 100);
}
