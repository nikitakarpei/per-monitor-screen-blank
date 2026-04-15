import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {
    getMonitorModeLabel,
    listMonitorModes,
} from '../../shared/util/monitor-modes.js';

export class GnomePointerContextMenu {
    constructor(actions = {}) {
        this._actions = actions;
        this._anchor = new St.Widget({
            reactive: true,
            width: 1,
            height: 1,
            x: 0,
            y: 0,
        });
        Main.uiGroup.add_child(this._anchor);

        this._menu = new PopupMenu.PopupMenu(this._anchor, 0, St.Side.TOP);
        this._menu.actor.hide();
        Main.uiGroup.add_child(this._menu.actor);

        /* Without PopupMenuManager the menu never grabs a modal; clicks elsewhere do not close it. */
        this._menuManager = new PopupMenu.PopupMenuManager(this._anchor);
        this._menuManager.addMenu(this._menu);
    }

    destroy() {
        this._menu?.destroy();
        this._menu = undefined;
        this._menuManager = undefined;
        this._anchor?.destroy();
        this._anchor = undefined;
    }

    open(context = {}) {
        if (!this._menu || !this._anchor) return;
        const [x, y] = globalThis.get_pointer();
        this._anchor.set_position(x, y);
        this._rebuild(context);
        this._menu.open();
    }

    _rebuild(context) {
        this._menu.removeAll();
        const header = new PopupMenu.PopupMenuItem('Monitor mode', {
            reactive: false,
            can_focus: false,
        });
        this._menu.addMenuItem(header);
        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        for (const mode of listMonitorModes()) {
            this._addModeAction(
                mode,
                context.currentMode,
                this._getModeHandler(mode),
            );
        }
    }

    _getModeHandler(mode) {
        switch (mode) {
            case 'auto': {
                return () => this._actions.auto?.();
            }
            case 'disabled': {
                return () => this._actions.disabled?.();
            }
            case 'keep-awake': {
                return () => this._actions.keepAwake?.();
            }
            case 'manual-black': {
                return () => this._actions.blackNow?.();
            }
            default: {
                return () => {};
            }
        }
    }

    _addModeAction(mode, currentMode, handler) {
        const marker = mode === currentMode ? '● ' : '';
        this._menu.addAction(`${marker}${getMonitorModeLabel(mode)}`, () => {
            handler();
            this._menu.close();
        });
    }
}
