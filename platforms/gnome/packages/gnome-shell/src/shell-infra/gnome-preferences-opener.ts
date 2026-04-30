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
    readonly #openPreferences: () => Promise<void>;
    #idleSourceId: number | undefined;

    constructor({
        openPreferences,
    }: {
        readonly openPreferences: () => Promise<void>;
    }) {
        this.#openPreferences = openPreferences;
        this.#idleSourceId = undefined;
    }

    /**
     * Schedules opening preferences on the next idle iteration.
     * No-op if already scheduled.
     */
    openSafely(): void {
        if (this.#idleSourceId !== undefined) {
            return;
        }

        this.#idleSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this.#idleSourceId = undefined;
            void this.#openPreferences();
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Removes any pending idle source. Called during cleanup/dispose.
     */
    dispose(): void {
        if (this.#idleSourceId !== undefined) {
            void GLib.Source.remove(this.#idleSourceId);
            this.#idleSourceId = undefined;
        }
    }
}
