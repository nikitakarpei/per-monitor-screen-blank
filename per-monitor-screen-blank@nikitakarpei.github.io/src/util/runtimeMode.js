const VALID_RUNTIME_MODES = new Set(['event-driven', 'polling']);

export function normalizeRuntimeMode(mode, fallback = 'event-driven') {
    const normalized = String(mode ?? '').trim().toLowerCase();
    return VALID_RUNTIME_MODES.has(normalized) ? normalized : fallback;
}
