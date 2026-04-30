import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { type Disposable } from '@pmsb/lifecycle';
import { type PointerMenuShortcutManager } from '@pmsb/application';

const GSETTINGS_KEY = 'pointer-menu-shortcut';

export class GnomePointerMenuShortcutManager
    implements PointerMenuShortcutManager, Disposable
{
    readonly #settings: Gio.Settings;
    #registered: boolean = false;

    constructor(settings: Gio.Settings) {
        this.#settings = settings;
    }

    register(onShortcut: () => void): void {
        void Main.wm.addKeybinding(
            GSETTINGS_KEY,
            this.#settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            onShortcut,
        );
        this.#registered = true;
    }

    unregister(): void {
        if (!this.#registered) {
            return;
        }
        Main.wm.removeKeybinding(GSETTINGS_KEY);
        this.#registered = false;
    }

    dispose(): void {
        this.unregister();
    }
}
