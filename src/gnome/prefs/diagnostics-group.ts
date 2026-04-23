import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import { LogOpener } from './log-opener/log-opener.js';
import { LoggerPort } from '../../util/logger.js';

interface DiagnosticsGroupDeps {
    logger: LoggerPort;
    logOpener: LogOpener;
}

export class DiagnosticsGroup extends Adw.PreferencesGroup {
    static {
        void GObject.registerClass({ GTypeName: 'DiagnosticsGroup' }, this);
    }

    _logOpener: LogOpener;

    constructor(deps: DiagnosticsGroupDeps) {
        super({ title: 'Troubleshooting' });

        this._logOpener = deps.logOpener;

        const row = new Adw.ActionRow({
            title: 'Open Troubleshooting Logs',
            subtitle: 'Open a terminal with live extension logs.',
        });

        const button = new Gtk.Button({
            label: 'Open',
            valign: Gtk.Align.CENTER,
        });

        void button.connect('clicked', () => {
            this._logOpener.open().catch(() => {
                deps.logger.warn('failed to open extension logs');
            });
        });

        row.add_suffix(button);
        row.activatable_widget = button;
        this.add(row);
    }

    destroy(): void {
        // Widget signals auto-clean when parent widgets are destroyed
        // _logOpener has no destroy method currently
    }
}
