import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import type { GeneralSettings, LoggerPort } from '@pmsb/application';

export class ShortcutCaptureDialog {
    readonly #window: Gtk.Window;
    readonly #generalSettings: GeneralSettings;
    readonly #shortcutLabel: Adw.ShortcutLabel;
    readonly #logger: LoggerPort;

    #keyController: Gtk.EventControllerKey | undefined;
    #idleSourceId: number | undefined;

    constructor(
        window: Gtk.Window,
        generalSettings: GeneralSettings,
        shortcutLabel: Adw.ShortcutLabel,
        logger: LoggerPort,
    ) {
        this.#window = window;
        this.#generalSettings = generalSettings;
        this.#shortcutLabel = shortcutLabel;
        this.#logger = logger;
    }

    present(): void {
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
        this.#keyController = keyController;

        void keyController.connect(
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

                this.#generalSettings.setPointerMenuShortcut([accel]);
                this.#shortcutLabel.accelerator = accel;
                dialog.force_close();
                return Gdk.EVENT_STOP;
            },
        );

        void dialog.connect(
            'response',
            (_self: Adw.AlertDialog, response: string) => {
                if (response === 'cancel') {
                    dialog.force_close();
                }
            },
        );
        dialog.present(this.#window);

        this.#idleSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this.#idleSourceId = undefined;
            try {
                void sink.grab_focus();
            } catch {
                this.#logger.warn('shortcut capture focus failed');
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    destroy(): void {
        if (this.#idleSourceId !== undefined) {
            void GLib.source_remove(this.#idleSourceId);
            this.#idleSourceId = undefined;
        }
        if (this.#keyController !== undefined) {
            this.#keyController = undefined;
        }
    }
}
