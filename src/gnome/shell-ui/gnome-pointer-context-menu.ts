import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import type { PointerContextMenu, ContextMenuItem } from '../../ports/index.js';
import { LoggerPort } from '../../util/logger.js';

interface GlobalWithPointer {
    get_pointer?: () => [number, number, number];
}

/**
 * Actor type with GNOME Shell animation extensions.
 * GNOME Shell monkey-patches `ease` and `ease_property` onto Clutter.Actor at runtime.
 * Since the GIR types for clutter-18 don't include these extensions, we explicitly augment.
 */
type ActorWithAnimations = Clutter.Actor & {
    ease(properties: {
        opacity?: number;
        duration: number;
        mode: Clutter.AnimationMode;
        onComplete?: () => void;
    }): void;
    ease_property<T>(
        propertyName: string,
        target: T,
        properties: {
            duration: number;
            mode: Clutter.AnimationMode;
        },
    ): void;
};

export class GnomePointerContextMenu implements PointerContextMenu {
    constructor(options: { logger: LoggerPort }) {
        this._logger = options.logger;
    }

    private _anchor?: ActorWithAnimations;
    private _menu?: PopupMenu.PopupMenu;
    private _menuManager?: PopupMenu.PopupMenuManager;
    private _logger: LoggerPort;

    enable(): void {
        if (this._anchor || this._menu || this._menuManager) {
            this._logger.warn(
                'GnomePointerContextMenu.enable() called when already enabled',
            );
            return;
        }

        this._anchor = new St.Widget({
            reactive: true,
            width: 1,
            height: 1,
            x: 0,
            y: 0,
        }) as ActorWithAnimations;
        Main.layoutManager.uiGroup.add_child(this._anchor);

        this._menu = new PopupMenu.PopupMenu(this._anchor, 0, St.Side.TOP);
        this._menu.actor.hide();
        Main.layoutManager.uiGroup.add_child(this._menu.actor);

        /* Without PopupMenuManager the menu never grabs a modal; clicks elsewhere do not close it. */
        this._menuManager = new PopupMenu.PopupMenuManager(this._anchor);
        this._menuManager.addMenu(this._menu);
    }

    destroy(): void {
        const menu = this._menu;
        const anchor = this._anchor;
        const menuManager = this._menuManager;

        if (!menu && !anchor && !menuManager) {
            this._logger.warn(
                'GnomePointerContextMenu.destroy() called on already destroyed instance',
            );
            return;
        }

        menuManager!.removeMenu(menu!);
        Main.layoutManager.uiGroup.remove_child(anchor!);
        Main.layoutManager.uiGroup.remove_child(menu!.actor);

        menu!.destroy();
        anchor!.destroy();

        this._menu = undefined;
        this._menuManager = undefined;
        this._anchor = undefined;
    }

    open(items: ContextMenuItem[]): void {
        if (!this._menu || !this._anchor) {
            this._logger.warn(
                'GnomePointerContextMenu.open() called before enable()',
            );
            return;
        }

        const globalPtr = global as GlobalWithPointer;
        if (typeof globalPtr.get_pointer !== 'function') {
            this._logger.warn('global.get_pointer() is not available');
            return;
        }

        const [x, y] = globalPtr.get_pointer();
        this._anchor.set_position(x, y);
        this._rebuild(items);
        this._menu.open();
    }

    private _rebuild(items: ContextMenuItem[]): void {
        if (!this._menu) return;
        this._menu.removeAll();

        for (const item of items) {
            void this._menu.addAction(item.label, () => {
                try {
                    item.onActivate();
                } catch (error) {
                    this._logger.error(
                        `Error in context menu item handler for "${item.label}": ${String(error)}`,
                    );
                } finally {
                    this._menu?.close();
                }
            });
        }
    }
}
