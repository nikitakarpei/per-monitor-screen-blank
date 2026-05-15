/**
 * GSettings key names for `org.gnome.shell.extensions.per-monitor-screen-blank`.
 * Must match `src/gnome/schemas/*.gschema.xml` — single source for TS/JS call sites.
 */
export const GSETTINGS_KEYS = {
    profileIds: 'profile-ids',
    activeProfileId: 'active-profile-id',
    lastActiveProfileId: 'last-active-profile-id',
    pointerMenuShortcut: 'pointer-menu-shortcut',
    idleTimeoutSeconds: 'idle-timeout-seconds',
    keepAwakeMinutes: 'keep-awake-minutes',
    showQuickSettingsMenu: 'show-quick-settings-menu',
    showIssueNotifications: 'show-issue-notifications',
    lastEnabledAtUsec: 'last-enabled-at-usec',
    disableAutoTimerOnPointerMonitor: 'disable-auto-timer-on-pointer-monitor',
    disableWindowObstructionPolicy: 'disable-window-obstruction-policy',
    fadeDurationMs: 'fade-duration-ms',
    dimIntensityPercent: 'dim-intensity-percent',
    knownMonitors: 'known-monitors',
} as const;

/** GSettings key names for per-profile relocatable schema. */
export const PROFILE_GSETTINGS_KEYS = {
    name: 'name',
    monitorModes: 'monitor-modes',
} as const;
