import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {
    gobjectConnectObject,
    gobjectDisconnectObject,
} from '../shared/gobject-helpers.js';
import { openExtensionLogs } from './log-opener.js';
import type { LoggerPort } from '../../util/logger.js';

interface BuildDiagnosticsGroupParameters {
    window: Gtk.Window;
    logger: LoggerPort;
}

interface DiagnosticsGroupResult {
    group: Adw.PreferencesGroup;
    destroy(): void;
}

export function buildDiagnosticsGroup({
    window,
    logger,
}: BuildDiagnosticsGroupParameters): DiagnosticsGroupResult {
    const group = new Adw.PreferencesGroup({
        title: 'Troubleshooting',
    });

    const row = new Adw.ActionRow({
        title: 'Open Troubleshooting Logs',
        subtitle: 'Open a terminal with live extension logs.',
    });

    const button = new Gtk.Button({
        label: 'Open',
        valign: Gtk.Align.CENTER,
    });

    gobjectConnectObject(
        button,
        'clicked',
        () => {
            openExtensionLogs(window, logger).catch(() => {
                logger.warn('failed to open extension logs');
            });
        },
        group,
    );

    row.add_suffix(button);
    row.activatable_widget = button;
    group.add(row);

    return {
        group,
        destroy() {
            gobjectDisconnectObject(button, group);
        },
    };
}
