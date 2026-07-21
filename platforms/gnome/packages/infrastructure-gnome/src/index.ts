// Public API for infrastructure-gnome package
export { GjsLogger } from './gjs-logger.js';
export {
    GSETTINGS_MAIN_ROOT_PATH,
    GSETTINGS_PROFILE_PATH_PREFIX,
    GSETTINGS_PROFILE_SCHEMA_ID,
    GSETTINGS_SCHEMA_ID,
} from './gsettings-schema-constants.js';

// GNOME platform integration
export { GnomeDeadlineScheduler } from './gnome-deadline-scheduler.js';
export { GnomeGeneralSettings } from './gnome-general-settings.js';
export { GnomeGeneralSettingsWatcher } from './gnome-general-settings-watcher.js';
export { GnomeExtensionLifecycleState } from './extension-lifecycle-state.js';
export { GnomeSettingsProvider } from './gnome-settings-provider.js';
export {
    GnomeProfileSettings,
    type ProfileGioSettingsFactory,
} from './gnome-profile-settings.js';
export { GnomeProfileSettingsWatcher } from './gnome-profile-settings-watcher.js';
export { GnomeMonitorIdentityWatcher } from './gnome-monitor-identity-watcher.js';
export { GnomePlatformEventBus } from './gnome-platform-event-bus.js';

// GNOME stores and registries
export { GnomeMonitorIdentityStore } from './monitor-identity-store.js';
