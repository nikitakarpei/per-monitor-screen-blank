import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {
    type GeneralSettings,
    type PlatformEventSubscriber,
    type LoggerPort,
} from '@pmsb/application';
import { ShortcutCaptureDialog } from './shortcut-capture-dialog.js';

export class ShortcutCaptureRow extends Adw.ActionRow {
    static {
        void GObject.registerClass({ GTypeName: 'ShortcutCaptureRow' }, this);
    }

    _generalSettings: GeneralSettings;
    _eventSubscriber: PlatformEventSubscriber;
    _window: Gtk.Window;
    _logger: LoggerPort;
    _shortcutLabel: Adw.ShortcutLabel;
    _dialog: ShortcutCaptureDialog | undefined;
    _unsubscribeShortcutChanged: (() => void) | undefined;

    constructor(
        generalSettings: GeneralSettings,
        eventSubscriber: PlatformEventSubscriber,
        window: Gtk.Window,
        logger: LoggerPort,
    ) {
        super({
            title: 'Shortcut for monitor menu',
            subtitle: 'Press to change. Press Escape to clear.',
        });

        this._generalSettings = generalSettings;
        this._eventSubscriber = eventSubscriber;
        this._window = window;
        this._logger = logger;

        const currentShortcut =
            generalSettings.getPointerMenuShortcut()?.[0] ?? '';

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
                this._generalSettings,
                this._shortcutLabel,
                this._logger,
            );
            this._dialog.present();
        });

        this._unsubscribeShortcutChanged = this._eventSubscriber.on(
            'pointer-shortcut-changed',
            (payload) => {
                this._shortcutLabel.accelerator = payload.shortcut?.[0] ?? '';
            },
        );

        this.add_suffix(this._shortcutLabel);
        this.add_suffix(captureButton);
    }

    destroy(): void {
        this._unsubscribeShortcutChanged?.();
        this._unsubscribeShortcutChanged = undefined;
        this._dialog?.destroy();
        this._dialog = undefined;
    }
}
