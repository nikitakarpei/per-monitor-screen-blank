import type Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { GSETTINGS_KEYS } from './gsettings-schema-keys.js';

/**
 * Shared lifecycle state written by the Shell extension and read by prefs.
 */
export class GnomeExtensionLifecycleState {
    readonly #settings: Gio.Settings;

    constructor(settings: Gio.Settings) {
        this.#settings = settings;
    }

    recordEnabledNow(): void {
        const wasPersisted = this.#settings.set_int64(
            GSETTINGS_KEYS.lastEnabledAtUsec,
            GLib.get_real_time(),
        );

        if (!wasPersisted) {
            throw new Error('failed to persist extension enable timestamp');
        }
    }

    getLastEnabledAtUsec(): number {
        return this.#settings.get_int64(GSETTINGS_KEYS.lastEnabledAtUsec);
    }
}
