import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import {
    GSETTINGS_KEYS,
    gsettingsChangedSignal,
} from '../gsettings-schema-keys.js';
import type { LoggerPort } from '../../util/logger.js';
import {
    gobjectConnectObject,
    gobjectDisconnectAllForHolder,
} from '../shared/gobject-helpers.js';

/**
 * Builds an ActionRow for shortcut configuration.
 *
 * @param settings - The GSettings instance.
 * @param window - The parent window for the dialog.
 * @param logger - The logger instance.
 * @returns An object containing the configured action row and a destroy function.
 */
export function buildShortcutRow(
    settings: Gio.Settings,
    window: Gtk.Window,
    logger: LoggerPort,
): { row: Adw.ActionRow; destroy(): void } {
    const row = new Adw.ActionRow({
        title: 'Shortcut for monitor menu',
        subtitle: 'Press to change. Press Escape to clear.',
    });

    const currentShortcut =
        settings.get_strv(GSETTINGS_KEYS.pointerMenuShortcut)?.[0] ?? '';

    const shortcutLabel = new Adw.ShortcutLabel({
        accelerator: currentShortcut,
        valign: Gtk.Align.CENTER,
    });

    const captureButton = new Gtk.Button({
        icon_name: 'input-keyboard-symbolic',
        valign: Gtk.Align.CENTER,
        tooltip_text: 'Click to set new shortcut',
    });

    // Create a button to capture the shortcut
    gobjectConnectObject(
        captureButton,
        'clicked',
        () => {
            _promptShortcutCapture(
                window,
                settings,
                (accel) => {
                    shortcutLabel.accelerator = accel;
                },
                logger,
            );
        },
        row,
    );

    // Listen for gsettings changes to update the label
    gobjectConnectObject(
        settings,
        gsettingsChangedSignal(GSETTINGS_KEYS.pointerMenuShortcut),
        () => {
            const updatedShortcut =
                settings.get_strv(GSETTINGS_KEYS.pointerMenuShortcut)?.[0] ??
                '';
            shortcutLabel.accelerator = updatedShortcut;
        },
        row,
    );

    row.add_suffix(shortcutLabel);
    row.add_suffix(captureButton);

    function destroy(): void {
        gobjectDisconnectAllForHolder(row);
    }

    return { row, destroy };
}

/**
 * Prompt user to capture a keyboard shortcut.
 *
 * @param window - The parent window for the dialog.
 * @param settings - The GSettings instance to save the shortcut.
 * @param onApplied - Optional callback when a valid shortcut is captured.
 * @param logger - Optional logger for warnings.
 */
function _promptShortcutCapture(
    window: Gtk.Window,
    settings: Gio.Settings,
    onApplied: (accel: string) => void,
    logger: LoggerPort,
): void {
    const dialog = new Adw.AlertDialog({
        heading: 'Set shortcut for monitor menu',
        body: 'Press the new key combination. Press Escape to cancel.',
    });
    dialog.add_response('cancel', 'Cancel');
    dialog.set_close_response('cancel');
    dialog.set_default_response('cancel');

    const sink = new Gtk.DrawingArea({
        height_request: 56,
        hexpand: true,
        focusable: true,
    });
    dialog.set_extra_child(sink);

    const keyController = new Gtk.EventControllerKey();
    sink.add_controller(keyController);

    gobjectConnectObject(
        keyController,
        'key-pressed',
        (
            _keycode: number,
            keyval: number,
            _rawState: number,
            state: Gdk.ModifierType,
        ) => {
            if (keyval === Gdk.KEY_Escape) {
                dialog.force_close();
                return Gdk.EVENT_STOP;
            }

            const mods = state & Gtk.accelerator_get_default_mod_mask();
            if (!Gtk.accelerator_valid(keyval, mods)) {
                return Gdk.EVENT_STOP;
            }

            const accel = Gtk.accelerator_name(keyval, mods);

            // Gio.Settings.set_strv returns boolean indicating success
            const saved = settings.set_strv(
                GSETTINGS_KEYS.pointerMenuShortcut,
                [accel],
            );
            if (!saved) {
                logger.warn('Failed to save shortcut to GSettings');
                return Gdk.EVENT_STOP;
            }
            onApplied(accel);
            dialog.force_close();
            return Gdk.EVENT_STOP;
        },
        dialog,
    );

    gobjectConnectObject(
        dialog,
        'response',
        (_self: Adw.AlertDialog, response: string) => {
            if (response === 'cancel') {
                dialog.force_close();
            }
        },
        dialog,
    );
    dialog.present(window);

    // GLib.idle_add returns a source ID; source auto-removed by returning SOURCE_REMOVE
    void GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        try {
            // grab_focus() returns boolean indicating success; already handled by exception
            void sink.grab_focus();
        } catch {
            logger.warn('shortcut capture focus failed');
        }
        return GLib.SOURCE_REMOVE;
    });
}
