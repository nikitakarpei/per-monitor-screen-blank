/// <reference path="./shell-ambient.d.ts" />

import Gio from 'gi://Gio';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import {
    registerAppEventHandlers,
    FocusedMonitorService,
    ModeStateResolver,
    AppEventBus,
    MonitorRegistry,
    IssueReportingLogger,
    DeduplicatingUserNotifications,
    type LoggerPort,
} from '@pmsb/application';
import {
    GjsLogger,
    GnomeDeadlineScheduler,
    GnomeGeneralSettings,
    GnomeGeneralSettingsWatcher,
    GnomeProfileSettings,
    GnomeProfileSettingsWatcher,
    GnomeMonitorIdentityStore,
    GnomeMonitorIdentityWatcher,
    GnomePlatformEventBus,
} from '@pmsb/infrastructure-gnome';
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
} from '@pmsb/gnome-shell';
import { createDisposableStore, type DisposableStore } from '@pmsb/lifecycle';

export default class PerMonitorScreenBlankExtension extends Extension {
    #schemaSource: Gio.SettingsSchemaSource | undefined;
    private _rootScope: DisposableStore | undefined;

    enable(): void {
        let logger: LoggerPort = new GjsLogger(this.metadata.uuid);
        logger.info('extension enabled');

        this._rootScope = createDisposableStore((error, resource) => {
            logger.error(
                `cleanup failure for ${resource.constructor.name}: ${String(error)}`,
            );
        });

        try {
            this.#initializeSchemaSource();

            const gioSettings = this.#getSettingsForSchema(
                'org.gnome.shell.extensions.per-monitor-screen-blank',
                '/org/gnome/shell/extensions/per-monitor-screen-blank/',
            );

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

            const preferencesOpener = new GnomePreferencesOpener({
                openPreferences: async () => {
                    this.openPreferences();
                },
            });
            this._rootScope.add(preferencesOpener);

            const profileSettings = new GnomeProfileSettings(gioSettings);

            const profileSettingsWatcher = new GnomeProfileSettingsWatcher(
                profileSettings,
                platformBus,
                logger,
            );
            this._rootScope.add(profileSettingsWatcher);

            const monitorIdentityStore = new GnomeMonitorIdentityStore(
                gioSettings,
            );

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

            const overlay = new GnomeOverlayManager(
                logger,
                tracker,
                platformBus,
            );
            this._rootScope.add(overlay);

            const pointerMenuShortcutManager =
                new GnomePointerMenuShortcutManager(gioSettings);
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

            platformBus.emit({
                type: 'application-bootstrap-requested',
                payload: {},
            });
        } finally {
            this._rootScope.dispose();
            this._rootScope = undefined;
        }
    }

    disable(): void {
        this._rootScope?.dispose();
        this._rootScope = undefined;
        this.#schemaSource = undefined;
    }

    #initializeSchemaSource(): void {
        const schemaDirectory = this.dir.get_child('schemas');
        const schemaDirectoryPath = schemaDirectory.get_path();
        if (!schemaDirectoryPath) {
            throw new Error(
                'per-monitor-screen-blank: Could not get schema directory path',
            );
        }
        this.#schemaSource = Gio.SettingsSchemaSource.new_from_directory(
            schemaDirectoryPath,
            Gio.SettingsSchemaSource.get_default(),
            false,
        );
    }

    #getSettingsForSchema(schemaId: string, path: string): Gio.Settings {
        if (!this.#schemaSource) {
            throw new Error(
                'per-monitor-screen-blank: SettingsSchemaSource not initialized — was enable() called?',
            );
        }
        const schema = this.#schemaSource.lookup(schemaId, true);
        if (!schema) {
            throw new Error(
                `per-monitor-screen-blank: Schema ${schemaId} not found in extension schema source`,
            );
        }
        return new Gio.Settings({ settings_schema: schema, path });
    }
}
