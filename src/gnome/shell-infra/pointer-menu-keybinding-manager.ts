import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { PointerMenuKeybindingManager as IPointerMenuKeybindingManager } from '../../ports/index.js';
import type { Logger } from '../../util/logger.js';

const GSETTINGS_KEY = 'pointer-menu-shortcut';

interface PointerMenuKeybindingManagerOptions {
    settings: Gio.Settings;
    logger: Logger;
}

export class PointerMenuKeybindingManager implements IPointerMenuKeybindingManager {
    private _settings: Gio.Settings;
    private _logger: Logger;
    private _registered: boolean;

    constructor(options: PointerMenuKeybindingManagerOptions) {
        this._settings = options.settings;
        this._logger = options.logger;
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
