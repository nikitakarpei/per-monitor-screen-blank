// Public API for infrastructure-gnome package
export { GjsLogger } from './gjs-logger.js';
export {
    GSETTINGS_MAIN_ROOT_PATH,
    GSETTINGS_PROFILE_PATH_PREFIX,
    GSETTINGS_PROFILE_SCHEMA_ID,
    GSETTINGS_SCHEMA_ID,
} from './gnome/gsettings-schema-constants.js';

// GNOME platform integration
export { GnomeDeadlineScheduler } from './gnome/shared/gnome-deadline-scheduler.js';
export { GnomeGeneralSettings } from './gnome/gnome-general-settings.js';
export { GnomeGeneralSettingsWatcher } from './gnome/gnome-general-settings-watcher.js';
export { GnomeSettingsProvider } from './gnome/gnome-settings-provider.js';
export {
    GnomeProfileSettings,
    type ProfileGioSettingsFactory,
} from './gnome/gnome-profile-settings.js';
export { GnomeProfileSettingsWatcher } from './gnome/gnome-profile-settings-watcher.js';
export { GnomeMonitorIdentityWatcher } from './gnome/gnome-monitor-identity-watcher.js';
export { GnomePlatformEventBus } from './gnome/shared/gnome-platform-event-bus.js';

// GNOME stores and registries
export { GnomeMonitorIdentityStore } from './gnome/shared/monitor-identity-store.js';
