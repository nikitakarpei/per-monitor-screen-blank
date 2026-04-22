import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import { GSETTINGS_KEYS } from '../gsettings-schema-keys.js';
import { LoggerPort } from '../../util/logger.js';
import { ShortcutCaptureDialog } from './shortcut-capture-dialog.js';

export class ShortcutCaptureRow extends Adw.ActionRow {
    static {
        void GObject.registerClass(this);
    }

    _settings: Gio.Settings;
    _window: Gtk.Window;
    _logger: LoggerPort;
    _shortcutLabel: Adw.ShortcutLabel;
    _dialog: ShortcutCaptureDialog | undefined;

    constructor(
        settings: Gio.Settings,
        window: Gtk.Window,
        logger: LoggerPort,
    ) {
        super({
            title: 'Shortcut for monitor menu',
            subtitle: 'Press to change. Press Escape to clear.',
        });

        this._settings = settings;
        this._window = window;
        this._logger = logger;

        const currentShortcut =
            settings.get_strv(GSETTINGS_KEYS.pointerMenuShortcut)?.[0] ?? '';

        this._shortcutLabel = new Adw.ShortcutLabel({
            accelerator: currentShortcut,
            valign: Gtk.Align.CENTER,
        });

        const captureButton = new Gtk.Button({
            icon_name: 'input-keyboard-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Click to set new shortcut',
        });

        void captureButton.connect('clicked', () => {
            this._dialog ??= new ShortcutCaptureDialog(
                this._window,
                this._settings,
                this._shortcutLabel,
                this._logger,
            );
            this._dialog.present();
        });

        this._settings.bind(
            GSETTINGS_KEYS.pointerMenuShortcut,
            this._shortcutLabel as GObject.Object,
            'accelerator',
            Gio.SettingsBindFlags.DEFAULT,
        );

        this.add_suffix(this._shortcutLabel);
        this.add_suffix(captureButton);
    }

    destroy(): void {
        this._dialog?.destroy();
        this._dialog = undefined;
    }
}
