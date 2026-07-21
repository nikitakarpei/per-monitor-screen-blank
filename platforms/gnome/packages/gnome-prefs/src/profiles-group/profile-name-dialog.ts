import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

export function promptForProfileName(
    window: Gtk.Window,
    title: string,
    initialValue: string,
): Promise<string | undefined> {
    return new Promise((resolve) => {
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

        void dialog.connect(
            'response',
            (_source: Adw.AlertDialog, response: string) => {
                const result: string | undefined =
                    response === 'ok'
                        ? entry.get_text().trim() || undefined
                        : undefined;
                resolve(result);
            },
        );

        dialog.present(window);
    });
}
