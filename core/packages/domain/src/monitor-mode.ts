/** Single source for mode literals; `MonitorMode` is derived so it cannot drift. */
export const MONITOR_MODES = [
    'auto',
    'disabled',
    'keep-awake',
    'manual-black',
] as const;

export type MonitorMode = (typeof MONITOR_MODES)[number];

/** The default mode to use when none is specified. */
export const DEFAULT_MONITOR_MODE: MonitorMode = 'disabled';

/** Resolves an optional mode to a definite mode, falling back to the default. */
export function resolveMode(mode: MonitorMode | undefined): MonitorMode {
    return mode ?? DEFAULT_MONITOR_MODE;
}
