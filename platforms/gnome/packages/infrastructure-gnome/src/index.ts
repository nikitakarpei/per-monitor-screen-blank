// Public API for infrastructure-gnome package
export { GjsLogger } from './gjs-logger.js';

// Serialization utilities
export { buildLogicalMonitorIdentity } from './serialization/monitors/monitor-identity.js';
export {
    normalizeDimIntensityPercent,
    dimIntensityPercentToOpacity,
} from './serialization/numeric/dim-intensity.js';
export { normalizeFadeDurationMs } from './serialization/numeric/fade-duration.js';

// GNOME platform integration
export { GnomeDeadlineScheduler } from './gnome/shared/gnome-deadline-scheduler.js';
export { GnomeSettingsGateway } from './gnome/shared/gnome-settings-gateway.js';
export { GnomePlatformEventBus } from './gnome/shared/gnome-platform-event-bus.js';

// GNOME stores and registries
export {
    KnownMonitorEntry,
    GnomeMonitorIdentityStore,
} from './gnome/shared/monitor-identity-store.js';
export { ProfileStore } from './gnome/shared/profile-store.js';
export { ProfileRegistry } from './gnome/shared/profile-registry.js';

// GNOME schema utilities
export {
    GSETTINGS_KEYS,
    PROFILE_GSETTINGS_KEYS,
    gsettingsChangedSignal,
} from './gnome/gsettings-schema-keys.js';

// Utility functions
export { buildIssueNotificationText } from './util/issue-notification-text.js';
