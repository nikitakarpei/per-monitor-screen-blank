import { DEFAULTS } from './defaults.js';

export function normalizeFadeDurationMs(durationMs, fallback = DEFAULTS.fadeDurationMs) {
    const normalized = Number.isFinite(durationMs) ? durationMs : fallback;
    return Math.max(0, Math.floor(normalized));
}
