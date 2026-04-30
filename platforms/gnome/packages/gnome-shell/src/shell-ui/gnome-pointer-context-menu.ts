import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {
    type PointerContextMenu,
    type ContextMenuItem,
    type LoggerPort,
} from '@pmsb/application';
import { type Disposable } from '@pmsb/lifecycle';

export class GnomePointerContextMenu implements PointerContextMenu, Disposable {
    readonly #logger: LoggerPort;
    readonly #anchor: St.Widget;
    readonly #menu: PopupMenu.PopupMenu;
    readonly #menuManager: PopupMenu.PopupMenuManager;

    constructor(logger: LoggerPort) {
        this.#logger = logger;

        this.#anchor = new St.Widget({
            reactive: true,
            width: 1,
            height: 1,
            x: 0,
            y: 0,
        });
        Main.layoutManager.uiGroup.add_child(this.#anchor);

        this.#menu = new PopupMenu.PopupMenu(this.#anchor, 0, St.Side.TOP);
        this.#menu.actor.hide();
        Main.layoutManager.uiGroup.add_child(this.#menu.actor);

        /* Without PopupMenuManager the menu never grabs a modal; clicks elsewhere do not close it. */
        this.#menuManager = new PopupMenu.PopupMenuManager(this.#anchor);
        this.#menuManager.addMenu(this.#menu);
    }

    dispose(): void {
        this.#menuManager.removeMenu(this.#menu);
        Main.layoutManager.uiGroup.remove_child(this.#anchor);
        Main.layoutManager.uiGroup.remove_child(this.#menu.actor);

        this.#menu.destroy();
        this.#anchor.destroy();
    }

    open(items: ContextMenuItem[]): void {
        const [x, y] = global.get_pointer();
        this.#anchor.set_position(x, y);
        this.#rebuild(items);
        this.#menu.open();
    }

    #rebuild(items: ContextMenuItem[]): void {
        this.#menu.removeAll();

        for (const item of items) {
            void this.#menu.addAction(item.label, () => {
                try {
                    item.onActivate();
                } catch (error) {
                    this.#logger.error(
                        `Error in context menu item handler for "${item.label}": ${String(error)}`,
                    );
                } finally {
                    this.#menu.close();
                }
            });
        }
    }
}
