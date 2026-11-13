import GLib from 'gi://GLib';
import type Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { PointerVisibility } from '@pmsb/application';
import type { Disposable } from '@pmsb/lifecycle';
import type { GnomeMonitorIndex } from '../shell-infra/gnome-monitor-index.js';

export class GnomePointerVisibility implements PointerVisibility, Disposable {
    readonly #indexResolver: GnomeMonitorIndex;
    readonly #cursorTracker: Meta.CursorTracker;
    #monitorIds = new Set<string>();
    #cursorInhibited = false;
    #cursorWatch?: number;

    constructor(indexResolver: GnomeMonitorIndex) {
        this.#indexResolver = indexResolver;
        this.#cursorTracker = global.backend.get_cursor_tracker();
    }

    setHiddenMonitors(monitorIds: readonly string[]): void {
        this.#monitorIds = new Set(monitorIds);
        this.#updateCursorVisibility();
    }

    dispose(): void {
        this.setHiddenMonitors([]);
    }

    #updateCursorVisibility(): void {
        const needsWatch = this.#monitorIds.size > 0;
        if (needsWatch && this.#cursorWatch === undefined) {
            this.#cursorWatch = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                100,
                () => {
                    this.#syncCursorVisibility();
                    return GLib.SOURCE_CONTINUE;
                },
            );
        } else if (!needsWatch && this.#cursorWatch !== undefined) {
            void GLib.Source.remove(this.#cursorWatch);
            this.#cursorWatch = undefined;
        }
        this.#syncCursorVisibility();
    }

    #syncCursorVisibility(): void {
        const [x, y] = global.get_pointer();
        // Cursor visibility is global, so only inhibit it while the pointer
        // is over a fully blanked monitor. Dimming must leave it visible.
        const blanked = [...this.#monitorIds].some((monitorId) => {
            const index = this.#indexResolver.tryGetIndexByMonitorId(monitorId);
            const monitor =
                index === undefined
                    ? undefined
                    : Main.layoutManager.monitors[index];
            return (
                monitor !== undefined &&
                x >= monitor.x &&
                y >= monitor.y &&
                x < monitor.x + monitor.width &&
                y < monitor.y + monitor.height
            );
        });
        this.#setCursorInhibited(blanked);
    }

    #setCursorInhibited(inhibited: boolean): void {
        if (inhibited === this.#cursorInhibited) {
            return;
        }
        if (inhibited) {
            this.#cursorTracker.inhibit_cursor_visibility();
        } else {
            this.#cursorTracker.uninhibit_cursor_visibility();
        }
        this.#cursorInhibited = inhibited;
    }
}
