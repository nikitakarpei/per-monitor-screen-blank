/// <reference path="./shell-ambient.d.ts" />

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import {
    registerAppEventHandlers,
    FocusedMonitorService,
    ModeStateResolver,
    AppEventBus,
    MonitorRegistry,
    IssueReportingLogger,
    DeduplicatingUserNotifications,
} from '@pmsb/application';
import type { LoggerPort } from '@pmsb/application';
import {
    GjsLogger,
    GnomeDeadlineScheduler,
    GnomeExtensionLifecycleState,
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
    GnomeOverlayManager,
    GnomePointerSource,
    GnomeMonitorTracker,
    GnomePointerMenuShortcutManager,
    GnomeQuickSettings,
    GnomePointerContextMenu,
    ShellNotifications,
    GnomePreferencesOpener,
    GnomeMonitorQuery,
    GnomeWindowObstructionPolicy,
} from '@pmsb/gnome-shell';
import { createDisposableStore } from '@pmsb/lifecycle';
import type { DisposableStore } from '@pmsb/lifecycle';

export default class PerMonitorScreenBlankExtension extends Extension {
    private _rootScope: DisposableStore | undefined;

    enable(): void {
        let logger: LoggerPort = new GjsLogger(this.metadata.uuid);
        logger.info('extension enabled');

        this._rootScope = createDisposableStore((error, resource) => {
            logger.error(
                `cleanup failure for ${resource.constructor.name}`,
                error,
            );
        });

        const settingsProvider = new GnomeSettingsProvider(this.path);

        const gioSettings = settingsProvider.createMainSettings();

        const lifecycleState = new GnomeExtensionLifecycleState(gioSettings);
        lifecycleState.recordEnabledNow();

        const generalSettings = new GnomeGeneralSettings(gioSettings);

        const userNotifications = new DeduplicatingUserNotifications(
            new ShellNotifications(),
        );
        this._rootScope.add(userNotifications);

        logger = new IssueReportingLogger(logger, userNotifications, () =>
            generalSettings.getShowIssueNotifications(),
        );

        const platformBus = new GnomePlatformEventBus(logger);
        this._rootScope.add(platformBus);

        const bus = new AppEventBus(logger, platformBus);
        this._rootScope.add(bus);

        const generalSettingsWatcher = new GnomeGeneralSettingsWatcher(
            generalSettings,
            platformBus,
            logger,
        );
        this._rootScope.add(generalSettingsWatcher);

        const preferencesOpener = new GnomePreferencesOpener(() =>
            this.openPreferences(),
        );
        this._rootScope.add(preferencesOpener);

        const createProfileSettings: ProfileGioSettingsFactory =
            settingsProvider.createProfileSettings.bind(settingsProvider);

        const profileSettings = new GnomeProfileSettings(
            gioSettings,
            createProfileSettings,
            logger,
        );

        const profileSettingsWatcher = new GnomeProfileSettingsWatcher(
            profileSettings,
            platformBus,
            logger,
        );
        this._rootScope.add(profileSettingsWatcher);

        const monitorIdentityStore = new GnomeMonitorIdentityStore(gioSettings);

        const monitorIdentityWatcher = new GnomeMonitorIdentityWatcher(
            monitorIdentityStore,
            platformBus,
            logger,
        );
        this._rootScope.add(monitorIdentityWatcher);

        const monitorQuery = new GnomeMonitorQuery();

        const tracker = new GnomeMonitorTracker(
            logger,
            platformBus,
            monitorQuery,
        );
        this._rootScope.add(tracker);

        const pointerSource = new GnomePointerSource(
            logger,
            platformBus,
            tracker,
        );
        this._rootScope.add(pointerSource);

        const overlay = new GnomeOverlayManager(logger, tracker, platformBus);
        this._rootScope.add(overlay);

        const unredirectPolicy = new GnomeWindowObstructionPolicy(
            platformBus,
            logger,
            generalSettings,
        );
        this._rootScope.add(unredirectPolicy);

        const pointerMenuShortcutManager = new GnomePointerMenuShortcutManager(
            gioSettings,
        );
        this._rootScope.add(pointerMenuShortcutManager);

        const pointerContextMenu = new GnomePointerContextMenu(logger);
        this._rootScope.add(pointerContextMenu);

        const quickSettings = new GnomeQuickSettings(
            logger,
            preferencesOpener,
            profileSettings,
        );
        this._rootScope.add(quickSettings);

        const deadlineScheduler = new GnomeDeadlineScheduler(
            platformBus,
            logger,
        );
        this._rootScope.add(deadlineScheduler);

        const monitorRegistry = new MonitorRegistry(logger, bus);
        this._rootScope.add(monitorRegistry);

        const focusedMonitorService = new FocusedMonitorService(
            pointerSource,
            monitorRegistry,
        );

        const modeStateResolver = new ModeStateResolver(
            generalSettings,
            focusedMonitorService,
        );

        registerAppEventHandlers({
            bus,
            logger,
            generalSettings,
            profileSettings,
            deadlineScheduler,
            overlay,
            pointerContextMenu,
            pointerMenuShortcutManager,
            monitorRegistry,
            focusedMonitorService,
            modeStateResolver,
            monitorIdentityStore,
            connectedMonitorsQuery: monitorQuery,
            quickSettings,
        });

        profileSettings.ensureLastActiveProfileId();

        platformBus.emit({
            type: 'application-bootstrap-requested',
            payload: {},
        });
    }

    disable(): void {
        this._rootScope?.dispose();
        this._rootScope = undefined;
    }
}
