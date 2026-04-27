import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { type PointerMenuShortcutManager } from '@pmsb/application';
import { GjsLogger } from '@pmsb/infrastructure-gnome';

const GSETTINGS_KEY = 'pointer-menu-shortcut';

interface GnomePointerMenuShortcutManagerDeps {
    settings: Gio.Settings;
    logger: GjsLogger;
}

export class GnomePointerMenuShortcutManager implements PointerMenuShortcutManager {
    private _settings: Gio.Settings;
    private _logger: GjsLogger;
    private _registered: boolean;

    constructor(deps: GnomePointerMenuShortcutManagerDeps) {
        this._settings = deps.settings;
        this._logger = deps.logger;
        this._registered = false;
    }

    register(accel: string, callback: () => void): void {
        try {
            const setOk = this._settings.set_strv(
                GSETTINGS_KEY,
                accel ? [accel] : [],
            );
            if (!setOk) {
                this._logger.error(
                    `failed to set keybinding setting for accel: ${accel}`,
                );
            }
            void Main.wm.addKeybinding(
                GSETTINGS_KEY,
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                callback,
            );
            this._registered = true;
        } catch {
            this._logger.error(
                `failed to register keybinding for accel: ${accel}`,
            );
        }
    }

    unregister(): void {
        if (!this._registered) {
            return;
        }
        try {
            Main.wm.removeKeybinding(GSETTINGS_KEY);
            this._registered = false;
        } catch {
            this._logger.error(
                `failed to unregister keybinding: ${GSETTINGS_KEY}`,
            );
        }
    }
}
