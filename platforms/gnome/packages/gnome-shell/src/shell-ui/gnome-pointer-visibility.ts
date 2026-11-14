import type Meta from 'gi://Meta';
import type { PointerVisibility } from '@pmsb/application';
import type { Disposable } from '@pmsb/lifecycle';

/**
 * Hides the pointer through Mutter's cursor-visibility inhibition. Inhibition
 * is reference-counted by Mutter, so this adapter holds at most one inhibit
 * and releases it on dispose.
 */
export class GnomePointerVisibility implements PointerVisibility, Disposable {
    readonly #cursorTracker: Meta.CursorTracker;
    #cursorInhibited = false;

    constructor() {
        this.#cursorTracker = global.backend.get_cursor_tracker();
    }

    setHidden(hidden: boolean): void {
        if (hidden === this.#cursorInhibited) {
            return;
        }
        if (hidden) {
            this.#cursorTracker.inhibit_cursor_visibility();
        } else {
            this.#cursorTracker.uninhibit_cursor_visibility();
        }
        this.#cursorInhibited = hidden;
    }

    dispose(): void {
        this.setHidden(false);
    }
}
