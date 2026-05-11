import GLib from 'gi://GLib';
import type { Disposable } from '@pmsb/lifecycle';

export interface PreferencesOpener {
    openSafely(): void;
}

/**
 * Handles opening preferences window safely with proper GLib source cleanup.
 * Defers the open to the next idle iteration to avoid GTK/Clutter loop conflicts.
 */
export class GnomePreferencesOpener implements Disposable {
    readonly #openPreferences: () => void;
    #idleSourceId: number | undefined = undefined;

    constructor(openPreferences: () => void) {
        this.#openPreferences = openPreferences;
    }

    openSafely(): void {
        if (this.#idleSourceId !== undefined) {
            return;
        }

        this.#idleSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this.#idleSourceId = undefined;
            this.#openPreferences();
            return GLib.SOURCE_REMOVE;
        });
    }

    dispose(): void {
        if (this.#idleSourceId !== undefined) {
            void GLib.Source.remove(this.#idleSourceId);
            this.#idleSourceId = undefined;
        }
    }
}
