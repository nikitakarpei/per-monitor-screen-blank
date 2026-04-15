const VALID_MODES = new Set(['auto', 'disabled', 'keep-awake', 'manual-black']);

const MODE_LABELS = Object.freeze({
    auto: 'Automatic',
    disabled: 'Never Blank',
    'keep-awake': 'Keep Awake',
    'manual-black': 'Black Screen',
});

export function normalizeMode(mode, fallback = 'disabled') {
    const normalized = String(mode ?? '').trim().toLowerCase();
    return VALID_MODES.has(normalized) ? normalized : fallback;
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

export function listMonitorModes() {
    return ['auto', 'disabled', 'keep-awake', 'manual-black'];
}

export function getMonitorModeLabel(mode) {
    return MODE_LABELS[normalizeMode(mode)] ?? MODE_LABELS.disabled;
}
