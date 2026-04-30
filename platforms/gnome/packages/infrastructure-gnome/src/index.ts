// Public API for infrastructure-gnome package
export { GjsLogger } from './gjs-logger.js';

// GNOME platform integration
export { GnomeDeadlineScheduler } from './gnome/shared/gnome-deadline-scheduler.js';
export { GnomeGeneralSettings } from './gnome/gnome-general-settings.js';
export { GnomeGeneralSettingsWatcher } from './gnome/gnome-general-settings-watcher.js';
export { GnomeProfileSettings } from './gnome/gnome-profile-settings.js';
export { GnomeProfileSettingsWatcher } from './gnome/gnome-profile-settings-watcher.js';
export { GnomeMonitorIdentityWatcher } from './gnome/gnome-monitor-identity-watcher.js';
export { GnomePlatformEventBus } from './gnome/shared/gnome-platform-event-bus.js';

// GNOME stores and registries
export { GnomeMonitorIdentityStore } from './gnome/shared/monitor-identity-store.js';
