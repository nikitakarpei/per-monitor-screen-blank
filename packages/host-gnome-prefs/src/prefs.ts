import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { AppEventBus } from '@pmsb/application';
import {
    GjsLogger,
    ProfileRegistry,
    GnomeMonitorIdentityStore,
    GnomePlatformEventBus,
} from '@pmsb/infrastructure-gnome';
import { IssueReporter } from './prefs/issue-reporter.js';
import { GeneralSettingsGroup } from './prefs/general-settings-group.js';
import { MonitorModesGroup } from './prefs/monitor-modes-group/monitor-modes-group.js';

import { ProfilesGroup } from './prefs/profiles-group/profiles-group.js';
import { DiagnosticsGroup } from './prefs/diagnostics-group.js';

import { LogOpener } from './prefs/log-opener/log-opener.js';

/**
 * Per Monitor Screen Blank extension preferences class.
 * Manages the preferences window UI and lifecycle.
 */
export default class PerMonitorScreenBlankPrefs extends ExtensionPreferences {
    #schemaSource: Gio.SettingsSchemaSource | undefined = undefined;

    async fillPreferencesWindow(window: Adw.PreferencesWindow): Promise<void> {
        const settings = this.getSettings();
        const issueReporter = new IssueReporter(window, settings);
        const logger = new GjsLogger(this.metadata.uuid, (issue) =>
            issueReporter.report(issue),
        );
        const platformEventBus = new GnomePlatformEventBus(logger);
        const appEventBus = new AppEventBus({
            platformBus: platformEventBus,
            logger,
        });
        const profileRegistry = new ProfileRegistry({
            settings,
            eventEmitter: platformEventBus,
            createProfileSettings: (profileId: string) =>
                this.#getSettingsForSchema(
                    'org.gnome.shell.extensions.per-monitor-screen-blank.profile',
                    `/org/gnome/shell/extensions/per-monitor-screen-blank/profiles/${profileId}/`,
                ),
        });
        profileRegistry.start();
        profileRegistry.ensureDefaultProfile();

        const identityStore = new GnomeMonitorIdentityStore({
            settings,
            logger,
        });

        const page = new Adw.PreferencesPage({ title: 'Settings' });

        const generalSettingsGroup = new GeneralSettingsGroup({
            settings,
            window,
            logger,
        });

        const monitorModesGroup = new MonitorModesGroup({
            settings,
            profileRegistry,
            logger,
            identityStore,
            eventSubscriber: platformEventBus,
        });

        const profilesGroup = new ProfilesGroup({
            settings,
            profileRegistry,
            window,
            eventSubscriber: platformEventBus,
            logger,
        });

        const logOpener = new LogOpener(window, logger);

        const diagnosticsGroup = new DiagnosticsGroup({
            logOpener,
            logger,
        });

        page.add(monitorModesGroup);
        page.add(generalSettingsGroup);
        page.add(diagnosticsGroup);
        page.add(profilesGroup);

        window.add(page);

        const destroyHandlerId = window.connect('destroy', () => {
            window.disconnect(destroyHandlerId);
            issueReporter.destroy();
            generalSettingsGroup.destroy();
            monitorModesGroup.destroy();
            profilesGroup.destroy();
            diagnosticsGroup.destroy();
            profileRegistry.destroy();
            appEventBus.destroy();
            platformEventBus.destroy();
            this.#schemaSource = undefined;
        });
    }

    #getSettingsForSchema(
        schemaIdentifier: string,
        path: string,
    ): Gio.Settings {
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
}

// Promisify must run before any async work
Gio._promisify(
    Gio.Subprocess.prototype,
    'communicate_utf8_async',
    'communicate_utf8_finish',
);
