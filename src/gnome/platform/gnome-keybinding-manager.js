import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { logErrorWithContext } from '../../shared/util/logger.js';

export class GnomeKeybindingManager {
    /**
     * Registers a global keybinding using the GNOME Shell window manager.
     *
     * @param {string} name - GSettings key name for the accelerator strv
     * @param {Gio.Settings} settings - GSettings instance containing the keybinding key
     * @param {() => void} callback
     */
    register(name, settings, callback) {
        try {
            Main.wm.addKeybinding(
                name,
                settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                callback
            );
        } catch (error) {
            logErrorWithContext(error, 'failed to register keybinding', { name });
        }
    }

    /**
     * Unregisters a previously registered keybinding.
     * Silently swallows errors — removeKeybinding throws when the binding is not
     * registered, which is expected on first run and when the shortcut is cleared.
     *
     * @param {string} name
     */
    unregister(name) {
        try {
            Main.wm.removeKeybinding(name);
        } catch (error) {
            logErrorWithContext(error, 'failed to unregister keybinding', { name });
        }
    }
}
