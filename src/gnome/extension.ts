import Gio from 'gi://Gio';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { registerAppEventHandlers } from '../app/app-event-handlers.js';
import { FocusedMonitorService } from '../app/services/focused-monitor-service.js';
import { ModeStateResolver } from '../app/services/mode-state-resolver.js';
import { AppEventBus } from '../app/services/app-event-bus.js';
import { MonitorRegistry } from '../app/services/monitor-registry.js';
import { GnomeOverlayManager } from './shell-ui/gnome-overlay-manager.js';
import { GnomePointerSource } from './shell-infra/gnome-pointer-source.js';
import { GnomeMonitorTracker } from './shell-infra/gnome-monitor-tracker.js';
import { GnomeDeadlineScheduler } from './shared/gnome-deadline-scheduler.js';
import { GnomeSettingsGateway } from './shared/gnome-settings-gateway.js';
import { ProfileRegistry } from './shared/profile-registry.js';
import { GnomePointerMenuShortcutManager } from './shell-infra/pointer-menu-keybinding-manager.js';
import { GnomeQuickSettings } from './shell-ui/gnome-quick-settings.js';
import { GnomePointerContextMenu } from './shell-ui/gnome-pointer-context-menu.js';
import { GnomeMonitorIdentityStore } from './shared/monitor-identity-store.js';
import { GnomeIssueNotifier } from './shell-infra/gnome-issue-notifier.js';
import { GnomePreferencesOpener } from './shell-infra/gnome-preferences-opener.js';
import { Logger } from '../util/logger.js';
import { GnomePlatformEventBus } from './shared/gnome-platform-event-bus.js';
import { GnomeMonitorQuery } from './shell-infra/gnome-monitor-query.js';

export default class PerMonitorScreenBlankExtension extends Extension {
    private _bus: AppEventBus | undefined;
    private _logger: Logger | undefined;
    private _tracker: GnomeMonitorTracker | undefined;
    private _profileRegistry: ProfileRegistry | undefined;
    private _identityStore: GnomeMonitorIdentityStore | undefined;
    private _notifier: GnomeIssueNotifier | undefined;
    private _preferencesOpener: GnomePreferencesOpener | undefined;
    #schemaSource: Gio.SettingsSchemaSource | undefined;
    private _deadlineScheduler: GnomeDeadlineScheduler | undefined;
    private _pointerSource: GnomePointerSource | undefined;
    private _settingsGateway: GnomeSettingsGateway | undefined;
    private _monitorRegistry: MonitorRegistry | undefined;
    private _overlay: GnomeOverlayManager | undefined;
    private _quickSettings: GnomeQuickSettings | undefined;
    private _pointerContextMenu: GnomePointerContextMenu | undefined;
    private _pointerMenuShortcutManager:
        | GnomePointerMenuShortcutManager
        | undefined;
    private _platformBus: GnomePlatformEventBus | undefined;

    enable(): void {
        try {
            // Initialize schema source first — all settings lookups depend on it.
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

            const settings = this.getSettingsForSchema(
                'org.gnome.shell.extensions.per-monitor-screen-blank',
                '/org/gnome/shell/extensions/per-monitor-screen-blank/',
            );

            // Create issue notifier and logger
            const notifier = new GnomeIssueNotifier({ settings });
            this._notifier = notifier;
            this._logger = new Logger(this.metadata.uuid, (issue) =>
                notifier.reportIssue(issue),
            );
            this._logger.info('extension enabled');

            this._platformBus = new GnomePlatformEventBus(this._logger);
            this._bus = new AppEventBus({
                platformBus: this._platformBus,
                logger: this._logger,
            });

            const preferencesOpener = new GnomePreferencesOpener({
                openPreferences: async () => {
                    this.openPreferences();
                },
            });
            this._preferencesOpener = preferencesOpener;

            // Create ProfileRegistry for per-profile storage with factory
            this._profileRegistry = new ProfileRegistry({
                settings,
                eventEmitter: this._platformBus,
                createProfileSettings: (profileId: string) =>
                    this.getSettingsForSchema(
                        'org.gnome.shell.extensions.per-monitor-screen-blank.profile',
                        `/org/gnome/shell/extensions/per-monitor-screen-blank/profiles/${profileId}/`,
                    ),
            });

            this._settingsGateway = new GnomeSettingsGateway({
                settings,
                eventEmitter: this._platformBus,
                profileRegistry: this._profileRegistry!,
                logger: this._logger,
            });
            this._settingsGateway.ensureStorage();

            this._identityStore = new GnomeMonitorIdentityStore({
                settings,
                logger: this._logger,
            });

            const monitorQuery = new GnomeMonitorQuery({
                logger: this._logger,
            });

            this._tracker = new GnomeMonitorTracker({
                logger: this._logger,
                eventEmitter: this._platformBus,
                identityStore: this._identityStore!,
                monitorQuery,
            });

            this._pointerSource = new GnomePointerSource({
                logger: this._logger,
                eventEmitter: this._platformBus,
                indexResolver: this._tracker,
            });

            this._overlay = new GnomeOverlayManager({
                logger: this._logger,
                indexResolver: this._tracker,
                eventSubscriber: this._platformBus,
            });

            this._pointerMenuShortcutManager =
                new GnomePointerMenuShortcutManager({
                    settings,
                    logger: this._logger,
                });

            this._pointerContextMenu = new GnomePointerContextMenu({
                logger: this._logger,
            });
            this._pointerContextMenu.enable();

            this._quickSettings = new GnomeQuickSettings({
                preferencesOpener,
                settingsGateway: this._settingsGateway,
                logger: this._logger,
            });

            this._deadlineScheduler = new GnomeDeadlineScheduler({
                eventEmitter: this._platformBus,
                logger: this._logger,
            });

            this._monitorRegistry = new MonitorRegistry({
                logger: this._logger,
                bus: this._bus,
            });

            const focusedMonitorService = new FocusedMonitorService({
                pointerSource: this._pointerSource!,
                monitorRegistry: this._monitorRegistry!,
            });

            const modeStateResolver = new ModeStateResolver({
                gateway: this._settingsGateway!,
                focusedMonitorService,
            });

            registerAppEventHandlers({
                bus: this._bus!,
                logger: this._logger,
                settingsGateway: this._settingsGateway!,
                deadlineScheduler: this._deadlineScheduler!,
                overlay: this._overlay!,
                pointerContextMenu: this._pointerContextMenu!,
                indicatorControls: this._quickSettings!,
                pointerMenuShortcutManager: this._pointerMenuShortcutManager!,
                monitorRegistry: this._monitorRegistry!,
                focusedMonitorService,
                modeStateResolver,
                identityStore: this._identityStore!,
            });

            this._tracker!.start();

            this._profileRegistry!.start();
            this._settingsGateway!.start();

            this._quickSettings!.enable?.();
            this._quickSettings!.initProfiles?.(
                this._settingsGateway!.getProfiles(),
                this._settingsGateway!.getActiveProfileId(),
            );
            this._pointerSource!.start();

            // Emit initial state after all components are initialized
            this._tracker!.emitInitialState();
            this._settingsGateway!.emitInitialState();
        } catch (originalError) {
            this._logger?.error('extension activation failed');
            this._tracker?.stop();
            const message = `extension activation failed: ${String(originalError)}`;
            throw new Error(message, { cause: originalError });
        }
    }

    disable(): void {
        this._preferencesOpener?.destroy();
        this._notifier?.destroy();
        this._tracker?.stop();

        // Lifecycle teardown
        this._deadlineScheduler?.cancelAll();
        this._pointerSource?.stop();
        this._settingsGateway?.destroy();
        this._monitorRegistry?.clear();
        this._overlay?.disable();
        this._quickSettings?.destroy();
        this._pointerContextMenu?.destroy();
        this._pointerMenuShortcutManager?.unregister();
        this._bus?.destroy();
        this._platformBus?.destroy();

        // Clear lifecycle-managed resources
        this._deadlineScheduler = undefined;
        this._pointerSource = undefined;
        this._settingsGateway = undefined;
        this._monitorRegistry = undefined;
        this._overlay = undefined;
        this._quickSettings = undefined;
        this._pointerContextMenu = undefined;
        this._pointerMenuShortcutManager = undefined;
        this._notifier = undefined;
        this._preferencesOpener = undefined;

        // Identity store cleanup (subscriptions are handled by event bus destruction)
        this._identityStore = undefined;

        this._profileRegistry?.destroy();
        this._profileRegistry = undefined;
        this._bus = undefined;
        this._platformBus = undefined;
        this._logger = undefined;
        this.#schemaSource = undefined;
    }

    getSettingsForSchema(schemaId: string, path: string): Gio.Settings {
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
