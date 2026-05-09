import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { type LoggerPort } from '@pmsb/application';
import { type ProfileId } from '@pmsb/domain';
import {
    GSETTINGS_MAIN_ROOT_PATH,
    GSETTINGS_PROFILE_PATH_PREFIX,
    GSETTINGS_PROFILE_SCHEMA_ID,
    GSETTINGS_SCHEMA_ID,
} from './gsettings-schema-constants.js';

export class GnomeSettingsProvider {
    readonly #logger: LoggerPort;
    readonly #schemaSource: Gio.SettingsSchemaSource;

    constructor(extensionRoot: string | Gio.File, logger: LoggerPort) {
        this.#logger = logger;
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
            const message =
                'per-monitor-screen-blank: schema directory not found under extension root';
            this.#logger.error(message);
            throw new Error(message);
        }

        const schemaDirectoryPath = schemaDirectory.get_path();
        if (!schemaDirectoryPath) {
            const message =
                'per-monitor-screen-blank: schema directory path is unavailable';
            this.#logger.error(message);
            throw new Error(message);
        }

        try {
            return Gio.SettingsSchemaSource.new_from_directory(
                schemaDirectoryPath,
                Gio.SettingsSchemaSource.get_default(),
                false,
            );
        } catch (error) {
            const message = `per-monitor-screen-blank: failed to load schema source from ${schemaDirectoryPath}: ${String(error)}`;
            this.#logger.error(message);
            throw new Error(message, { cause: error });
        }
    }

    #createSettings(schemaId: string, path: string): Gio.Settings {
        const schema = this.#schemaSource.lookup(schemaId, true);
        if (!schema) {
            const message = `per-monitor-screen-blank: schema ${schemaId} not found in extension schema source`;
            this.#logger.error(message);
            throw new Error(message);
        }

        try {
            return new Gio.Settings({ settings_schema: schema, path });
        } catch (error) {
            const message = `per-monitor-screen-blank: failed to construct settings for schema ${schemaId} at ${path}: ${String(error)}`;
            this.#logger.error(message);
            throw new Error(message, { cause: error });
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
