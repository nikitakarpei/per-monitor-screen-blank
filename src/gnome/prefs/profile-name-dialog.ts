import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {
    gobjectConnectObject,
    gobjectDisconnectObject,
} from '../shared/gobject-helpers.js';

export function promptForProfileName(
    window: Gtk.Window,
    title: string,
    initialValue: string,
    callback: (name?: string) => void,
): void {
    const dialog = new Adw.AlertDialog({
        heading: title,
        body: 'Enter a preset name.',
    });
    dialog.add_response('cancel', 'Cancel');
    dialog.add_response('ok', 'Save');
    dialog.set_response_appearance('ok', Adw.ResponseAppearance.SUGGESTED);
    dialog.set_default_response('ok');
    dialog.set_close_response('cancel');

    const entry = new Gtk.Entry({ text: initialValue, hexpand: true });
    const extra = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 8,
        margin_top: 6,
        margin_bottom: 6,
    });
    extra.append(entry);
    dialog.set_extra_child(extra);

    gobjectConnectObject(
        dialog,
        'response',
        (_source: Adw.AlertDialog, response: string) => {
            gobjectDisconnectObject(dialog, dialog);
            if (response === 'ok') {
                const value = entry.get_text().trim();
                callback(value.length > 0 ? value : undefined);
            } else {
                callback();
            }
        },
        dialog,
    );

    dialog.present(window);
}
