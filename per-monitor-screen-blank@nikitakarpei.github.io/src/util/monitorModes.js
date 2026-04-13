const VALID_MODES = new Set(['auto', 'disabled', 'keep-awake', 'manual-black']);

export function normalizeMode(mode, fallback = 'disabled') {
    const normalized = String(mode ?? '').trim().toLowerCase();
    return VALID_MODES.has(normalized) ? normalized : fallback;
}

export function parseMonitorModes(rawValue) {
    if (!rawValue) return {};
    try {
        const parsed = JSON.parse(rawValue);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const normalized = {};
        for (const [monitorId, mode] of Object.entries(parsed)) {
            const key = String(monitorId ?? '').trim();
            if (!key) continue;
            normalized[key] = normalizeMode(mode);
        }
        return normalized;
    } catch (_) {
        return {};
    }
}

export function stringifyMonitorModes(monitorModes) {
    return JSON.stringify(sanitizeMonitorModes(monitorModes));
}

export function sanitizeMonitorModes(monitorModes) {
    const input = monitorModes && typeof monitorModes === 'object' ? monitorModes : {};
    const normalized = {};
    for (const [monitorId, mode] of Object.entries(input)) {
        const key = String(monitorId ?? '').trim();
        if (!key) continue;
        normalized[key] = normalizeMode(mode);
    }
    return normalized;
}
