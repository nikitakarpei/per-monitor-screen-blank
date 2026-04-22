import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { GSETTINGS_KEYS } from '../gsettings-schema-keys.js';
import { ShortcutCaptureRow } from './shortcut-capture.js';
import { LoggerPort } from '../../util/logger.js';

interface GeneralSettingsGroupDeps {
    settings: Gio.Settings;
    window: Gtk.Window;
    logger: LoggerPort;
}

export class GeneralSettingsGroup extends Adw.PreferencesGroup {
    static {
        void GObject.registerClass(this);
    }

    _settings: Gio.Settings;
    _shortcutRow: ShortcutCaptureRow;

    constructor(deps: GeneralSettingsGroupDeps) {
        super({ title: 'General Settings' });

        this._settings = deps.settings;

        // Blank after (idle timeout)
        const blankAfterRow = this._makeSpinRow(
            'Blank after',
            GSETTINGS_KEYS.idleTimeoutSeconds,
            1,
            1,
            3600,
            'seconds',
            'When a screen is set to Automatic, blank it after this much pointer inactivity.',
        );
        this.add(blankAfterRow);

        // Keep awake for
        const keepAwakeRow = this._makeSpinRow(
            'Keep awake for',
            GSETTINGS_KEYS.keepAwakeMinutes,
            1,
            1,
            1440,
            'minutes',
            'How long Keep Awake stays on before that screen returns to Automatic.',
        );
        this.add(keepAwakeRow);

        // Show quick settings menu
        const showQuickSettingsMenuRow = this._makeSwitchRow(
            'Show quick settings menu',
            GSETTINGS_KEYS.showQuickSettingsMenu,
            'Show an entry in the Quick Settings menu.',
        );
        this.add(showQuickSettingsMenuRow);

        // Show problem alerts
        const showAlertsRow = this._makeSwitchRow(
            'Show problem alerts',
            GSETTINGS_KEYS.showIssueNotifications,
            'Show a notification when something is not working as expected.',
        );
        this.add(showAlertsRow);

        // Do not blank the screen under the pointer
        const disableAutoTimerRow = this._makeSwitchRow(
            'Do not blank the screen under the pointer',
            GSETTINGS_KEYS.disableAutoTimerOnPointerMonitor,
            'Pause automatic blanking for the screen your pointer is currently on.',
        );
        this.add(disableAutoTimerRow);

        // Fade time
        const fadeTimeRow = this._makeSpinRow(
            'Fade time',
            GSETTINGS_KEYS.fadeDurationMs,
            10,
            0,
            5000,
            'ms',
            'How long the fade animation takes when the screen blacks out or wakes up.',
        );
        this.add(fadeTimeRow);

        // Darkness
        const darknessRow = this._makeSpinRow(
            'Darkness',
            GSETTINGS_KEYS.dimIntensityPercent,
            1,
            0,
            100,
            '%',
            'How dark the black overlay should be, from transparent to fully black.',
        );
        this.add(darknessRow);

        this._shortcutRow = new ShortcutCaptureRow(
            deps.settings,
            deps.window,
            deps.logger,
        );
        this.add(this._shortcutRow);
    }

    destroy(): void {
        this._shortcutRow.destroy();
    }

    _makeSwitchRow(
        title: string,
        key: string,
        subtitle: string,
    ): Adw.SwitchRow {
        const row = new Adw.SwitchRow({ title, subtitle });
        this._settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }

    _makeSpinRow(
        title: string,
        key: string,
        step: number,
        lower: number,
        upper: number,
        suffix: string,
        subtitle: string,
    ): Adw.SpinRow {
        const adj = new Gtk.Adjustment({
            lower,
            upper,
            step_increment: step,
            page_increment: step * 10,
            value: this._settings.get_int(key),
        });
        const row = new Adw.SpinRow({
            title,
            subtitle,
            adjustment: adj,
            numeric: true,
        });
        if (suffix) {
            row.add_suffix(
                new Gtk.Label({ label: suffix, valign: Gtk.Align.CENTER }),
            );
        }
        this._settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
        return row;
    }
}
