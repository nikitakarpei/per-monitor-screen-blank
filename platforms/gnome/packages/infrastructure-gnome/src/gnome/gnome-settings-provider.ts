import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import type { ProfileId } from '@pmsb/domain';
import {
    GSETTINGS_MAIN_ROOT_PATH,
    GSETTINGS_PROFILE_PATH_PREFIX,
    GSETTINGS_PROFILE_SCHEMA_ID,
    GSETTINGS_SCHEMA_ID,
} from './gsettings-schema-constants.js';

export class GnomeSettingsProvider {
    readonly #schemaSource: Gio.SettingsSchemaSource;

    constructor(extensionRoot: string | Gio.File) {
        this.#schemaSource = this.#loadSchemaSource(extensionRoot);
    }

    createMainSettings(): Gio.Settings {
        return this.#createSettings(
            GSETTINGS_SCHEMA_ID,
            GSETTINGS_MAIN_ROOT_PATH,
        );
    }

    createProfileSettings(profileId: ProfileId): Gio.Settings {
        return this.#createSettings(
            GSETTINGS_PROFILE_SCHEMA_ID,
            `${GSETTINGS_PROFILE_PATH_PREFIX}${profileId}/`,
        );
    }

    #loadSchemaSource(
        extensionRoot: string | Gio.File,
    ): Gio.SettingsSchemaSource {
        const schemaDirectory = this.#resolveSchemaDirectory(extensionRoot);
        if (!schemaDirectory.query_exists(null)) {
            throw new Error(
                `per-monitor-screen-blank: schema directory not found under extension root`,
            );
        }

        const schemaDirectoryPath = schemaDirectory.get_path();
        if (schemaDirectoryPath === null || schemaDirectoryPath === '') {
            throw new Error(
                `per-monitor-screen-blank: schema directory path is unavailable`,
            );
        }

        return Gio.SettingsSchemaSource.new_from_directory(
            schemaDirectoryPath,
            Gio.SettingsSchemaSource.get_default(),
            false,
        );
    }

    #createSettings(schemaId: string, path: string): Gio.Settings {
        const schema = this.#schemaSource.lookup(schemaId, true);
        if (!schema) {
            throw new Error(
                `per-monitor-screen-blank: schema ${schemaId} not found in extension schema source`,
            );
        }

        try {
            return new Gio.Settings({ settings_schema: schema, path });
        } catch (error) {
            throw new Error(
                `per-monitor-screen-blank: failed to construct settings for schema ${schemaId} at ${path}`,
                { cause: error },
            );
        }
    }

    #resolveSchemaDirectory(extensionRoot: string | Gio.File): Gio.File {
        if (typeof extensionRoot === 'string') {
            return Gio.File.new_for_path(
                GLib.build_filenamev([extensionRoot, 'schemas']),
            );
        }

        return extensionRoot.get_child('schemas');
    }
}
