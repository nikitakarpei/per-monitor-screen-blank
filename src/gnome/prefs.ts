import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { Logger } from '../util/logger.js';
import { ProfileRegistry } from './shared/profile-registry.js';
import { IssueReporter } from './prefs/issue-reporter.js';
import { buildGeneralSettingsGroup } from './prefs/general-settings-group.js';
import { buildMonitorModesGroup } from './prefs/monitor-modes-group.js';
import { MonitorIdentityStore } from './shared/monitor-identity-store.js';
import { buildProfilesGroup } from './prefs/profiles-group.js';
import { buildDiagnosticsGroup } from './prefs/diagnostics-group.js';
import { GnomePlatformEventBus } from './shared/gnome-platform-event-bus.js';
import { AppEventBus } from '../app/services/app-event-bus.js';

/** Callback for refreshing UI components */
type RefreshCallback = () => void;

/**
 * Per Monitor Screen Blank extension preferences class.
 * Manages the preferences window UI and lifecycle.
 */
export default class PerMonitorScreenBlankPrefs extends ExtensionPreferences {
    #schemaSource: Gio.SettingsSchemaSource | undefined = undefined;

    getSettingsForSchema(schemaIdentifier: string, path: string): Gio.Settings {
        if (!this.#schemaSource) {
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
        const schema = this.#schemaSource.lookup(schemaIdentifier, true);
        if (!schema) {
            throw new Error(
                `per-monitor-screen-blank: Schema ${schemaIdentifier} not found in extension schema source`,
            );
        }
        return new Gio.Settings({ settings_schema: schema, path });
    }

    /**
     * Fills the preferences window with UI components.
     * @param window - The Adw preferences window to populate
     */
    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        const settings = this.getSettings();
        const issueReporter = new IssueReporter();
        const logger = new Logger(this.metadata.uuid, (issue) =>
            issueReporter.report(window, settings, issue),
        );
        const platformEventBus = new GnomePlatformEventBus(logger);
        const appEventBus = new AppEventBus(platformEventBus, logger);
        const profileRegistry = new ProfileRegistry({
            settings,
            eventBus: platformEventBus,
            createProfileSettings: (profileId: string) =>
                this.getSettingsForSchema(
                    'org.gnome.shell.extensions.per-monitor-screen-blank.profile',
                    `/org/gnome/shell/extensions/per-monitor-screen-blank/profiles/${profileId}/`,
                ),
        });
        profileRegistry.start();
        void profileRegistry.ensureDefaultProfile();

        const identityStore = new MonitorIdentityStore({ settings, logger });

        const page = new Adw.PreferencesPage({ title: 'Settings' });

        const refreshCallbacks: RefreshCallback[] = [];
        const addRefresh = (callback: RefreshCallback): void => {
            refreshCallbacks.push(callback);
        };
        const refreshAll = (): void => {
            for (const callback of refreshCallbacks) {
                callback();
            }
        };

        const { group: generalGroup, destroy: destroyGeneral } =
            buildGeneralSettingsGroup({
                settings,
                window,
                logger,
            });

        const {
            group: monitorGroup,
            refresh: refreshMonitor,
            destroy: destroyMonitor,
        } = buildMonitorModesGroup({
            settings,
            profileRegistry,
            logger,
            identityStore,
        });

        const {
            group: profilesGroup,
            refresh: refreshProfiles,
            destroy: destroyProfiles,
        } = buildProfilesGroup({
            settings,
            profileRegistry,
            window,
            onChanged: refreshAll,
            addRefresh,
            logger,
        });

        const { group: diagnosticsGroup, destroy: destroyDiagnostics } =
            buildDiagnosticsGroup({
                window,
                logger,
            });

        page.add(monitorGroup);
        page.add(generalGroup);
        page.add(diagnosticsGroup);
        page.add(profilesGroup);

        // Register the refresh callbacks
        addRefresh(refreshMonitor);
        addRefresh(refreshProfiles);

        refreshAll();

        window.add(page);

        const destroyHandlerId = window.connect('destroy', () => {
            window.disconnect(destroyHandlerId);
            issueReporter.reset();
            destroyGeneral();
            destroyMonitor();
            destroyProfiles();
            destroyDiagnostics();
            profileRegistry.destroy();
            appEventBus.destroy();
            platformEventBus.destroy();
            this.#schemaSource = undefined;
        });
    }
}

// Promisify must run before any async work
Gio._promisify(
    Gio.Subprocess.prototype,
    'communicate_utf8_async',
    'communicate_utf8_finish',
);
