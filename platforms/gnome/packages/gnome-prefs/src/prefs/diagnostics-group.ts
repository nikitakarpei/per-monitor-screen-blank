import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import type { LogOpener } from './log-opener/log-opener.js';
import type { Disposable } from '@pmsb/lifecycle';

export class DiagnosticsGroup
    extends Adw.PreferencesGroup
    implements Disposable
{
    static {
        void GObject.registerClass({ GTypeName: 'DiagnosticsGroup' }, this);
    }

    readonly #logOpener: LogOpener;

    constructor(logOpener: LogOpener) {
        super({ title: 'Troubleshooting' });

        this.#logOpener = logOpener;

        const row = new Adw.ActionRow({
            title: 'Open Troubleshooting Logs',
            subtitle: 'Open a terminal with live extension logs.',
        });

        const button = new Gtk.Button({
            label: 'Open',
            valign: Gtk.Align.CENTER,
        });

        void button.connect('clicked', () => {
            this.#logOpener.open();
        });

        row.add_suffix(button);
        row.activatable_widget = button;
        this.add(row);
    }

    dispose(): void {
        this.#logOpener.dispose();
    }
}
