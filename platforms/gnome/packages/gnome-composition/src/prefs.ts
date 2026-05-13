/// <reference path="./prefs-ambient.d.ts" />

import Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {
    DeduplicatingUserNotifications,
    IssueReportingLogger,
} from '@pmsb/application';
import type { LoggerPort } from '@pmsb/application';
import {
    GjsLogger,
    GnomeGeneralSettings,
    GnomeGeneralSettingsWatcher,
    GnomeProfileSettings,
    GnomeProfileSettingsWatcher,
    GnomeMonitorIdentityStore,
    GnomeMonitorIdentityWatcher,
    GnomePlatformEventBus,
    GnomeSettingsProvider,
} from '@pmsb/infrastructure-gnome';
import type { ProfileGioSettingsFactory } from '@pmsb/infrastructure-gnome';
import {
    GeneralSettingsGroup,
    MonitorModesGroup,
    ProfilesGroup,
    DiagnosticsGroup,
    AdwNotifications,
    LogOpener,
} from '@pmsb/gnome-prefs';
import { createDisposableStore } from '@pmsb/lifecycle';

export default class PerMonitorScreenBlankPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        let logger: LoggerPort = new GjsLogger(this.metadata.uuid);
        logger.info('preferences window opened');

        const rootScope = createDisposableStore((error, resource) => {
            logger.error(
                `cleanup failure for ${resource.constructor.name}`,
                error,
            );
        });

        try {
            const settingsProvider = new GnomeSettingsProvider(this.path);
            const settings = settingsProvider.createMainSettings();

            const generalSettings = new GnomeGeneralSettings(settings);

            const adwNotifications = new AdwNotifications(window);
            rootScope.add(adwNotifications);

            const userNotifications = new DeduplicatingUserNotifications(
                adwNotifications,
            );
            rootScope.add(userNotifications);

            logger = new IssueReportingLogger(logger, userNotifications, () =>
                generalSettings.getShowIssueNotifications(),
            );

            const platformBus = new GnomePlatformEventBus(logger);
            rootScope.add(platformBus);

            const generalSettingsWatcher = new GnomeGeneralSettingsWatcher(
                generalSettings,
                platformBus,
                logger,
            );
            rootScope.add(generalSettingsWatcher);

            const createProfileSettings: ProfileGioSettingsFactory =
                settingsProvider.createProfileSettings.bind(settingsProvider);

            const profileSettings = new GnomeProfileSettings(
                settings,
                createProfileSettings,
                logger,
            );

            const profileSettingsWatcher = new GnomeProfileSettingsWatcher(
                profileSettings,
                platformBus,
                logger,
            );
            rootScope.add(profileSettingsWatcher);

            const monitorIdentityStore = new GnomeMonitorIdentityStore(
                settings,
            );

            const monitorIdentityWatcher = new GnomeMonitorIdentityWatcher(
                monitorIdentityStore,
                platformBus,
                logger,
            );
            rootScope.add(monitorIdentityWatcher);

            const page = new Adw.PreferencesPage({
                title: 'Settings',
            });

            const monitorModesGroup = new MonitorModesGroup(
                profileSettings,
                monitorIdentityStore,
                logger,
                platformBus,
            );
            rootScope.add(monitorModesGroup);
            page.add(monitorModesGroup);

            const generalSettingsGroup = new GeneralSettingsGroup(
                generalSettings,
                platformBus,
                window,
                logger,
            );
            rootScope.add(generalSettingsGroup);
            page.add(generalSettingsGroup);

            const logOpener = new LogOpener(window, logger);
            rootScope.add(logOpener);

            const diagnosticsGroup = new DiagnosticsGroup(logger, logOpener);
            rootScope.add(diagnosticsGroup);
            page.add(diagnosticsGroup);

            const profilesGroup = new ProfilesGroup(
                profileSettings,
                window,
                platformBus,
                logger,
            );
            rootScope.add(profilesGroup);
            page.add(profilesGroup);

            window.add(page);

            const closeHandlerId = window.connect('close-request', () => {
                rootScope.dispose();
                return false;
            });
            rootScope.add({
                dispose: () => {
                    window.disconnect(closeHandlerId);
                },
            });

            return Promise.resolve();
        } catch (error) {
            rootScope.dispose();
            return Promise.reject(error);
        }
    }
}
