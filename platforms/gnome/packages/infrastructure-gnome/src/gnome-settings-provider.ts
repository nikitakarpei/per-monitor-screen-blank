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

    constructor(extensionRootPath: string) {
        this.#schemaSource = this.#loadSchemaSource(extensionRootPath);
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

    #loadSchemaSource(extensionRootPath: string): Gio.SettingsSchemaSource {
        const schemaDirectoryPath =
            this.#resolveSchemaDirectoryPath(extensionRootPath);
        if (!GLib.file_test(schemaDirectoryPath, GLib.FileTest.EXISTS)) {
            throw new Error(
                `per-monitor-screen-blank: schema directory not found under extension root`,
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
            return Gio.Settings.new_full(schema, null, path);
        } catch (error) {
            throw new Error(
                `per-monitor-screen-blank: failed to construct settings for schema ${schemaId} at ${path}`,
                { cause: error },
            );
        }
    }

    #resolveSchemaDirectoryPath(extensionRootPath: string): string {
        return GLib.build_filenamev([extensionRootPath, 'schemas']);
    }
}
