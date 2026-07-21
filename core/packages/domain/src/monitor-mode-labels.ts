import type { MonitorMode } from './monitor-mode.js';

const MONITOR_MODE_LABELS: Readonly<Record<MonitorMode, string>> = {
    auto: 'Automatic',
    disabled: 'Never Blank',
    'keep-awake': 'Keep Awake',
    'manual-black': 'Black Screen',
};

/**
 * Human-readable label for prefs / Shell UI (not part of the domain model).
 * @param mode The monitor mode to get a label for
 * @returns Human-readable label for the mode
 */
export function getMonitorModeLabel(mode: MonitorMode): string {
    return MONITOR_MODE_LABELS[mode];
}
