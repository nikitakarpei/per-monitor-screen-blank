import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { type Disposable } from '@pmsb/lifecycle';
import {
    type GeneralSettings,
    type PlatformEventSubscriber,
    type LoggerPort,
} from '@pmsb/application';
import { ShortcutCaptureRow } from './shortcut-capture.js';

export class GeneralSettingsGroup
    extends Adw.PreferencesGroup
    implements Disposable
{
    static {
        void GObject.registerClass({ GTypeName: 'GeneralSettingsGroup' }, this);
    }

    readonly #shortcutRow: ShortcutCaptureRow;

    constructor(
        generalSettings: GeneralSettings,
        eventSubscriber: PlatformEventSubscriber,
        window: Gtk.Window,
        logger: LoggerPort,
    ) {
        super({ title: 'General Settings' });

        // Blank after (idle timeout)
        const blankAfterRow = this._makeSpinRow(
            'Blank after',
            () => generalSettings.getIdleTimeout(),
            (v) => generalSettings.setIdleTimeout(v),
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
            () => generalSettings.getKeepAwakeMinutes(),
            (v) => generalSettings.setKeepAwakeMinutes(v),
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
            () => generalSettings.getShowQuickSettingsMenu(),
            (v) => generalSettings.setShowQuickSettingsMenu(v),
            'Show an entry in the Quick Settings menu.',
        );
        this.add(showQuickSettingsMenuRow);

        // Show problem alerts
        const showAlertsRow = this._makeSwitchRow(
            'Show problem alerts',
            () => generalSettings.getShowIssueNotifications(),
            (v) => generalSettings.setShowIssueNotifications(v),
            'Show a notification when something is not working as expected.',
        );
        this.add(showAlertsRow);

        // Do not blank the screen under the pointer
        const disableAutoTimerRow = this._makeSwitchRow(
            'Do not blank the screen under the pointer',
            () => generalSettings.getDisableAutoTimerOnPointerMonitor(),
            (v) => generalSettings.setDisableAutoTimerOnPointerMonitor(v),
            'Pause automatic blanking for the screen your pointer is currently on.',
        );
        this.add(disableAutoTimerRow);

        // Disable compositor workaround for maximized/fullscreen windows
        const disableWindowObstructionRow = this._makeSwitchRow(
            'Disable compositor workaround for maximized/fullscreen windows',
            () => generalSettings.getDisableWindowObstructionPolicy(),
            (v) => generalSettings.setDisableWindowObstructionPolicy(v),
            'May improve performance but can cause overlay flickering.',
        );
        this.add(disableWindowObstructionRow);

        // Fade time
        const fadeTimeRow = this._makeSpinRow(
            'Fade time',
            () => generalSettings.getFadeDuration(),
            (v) => generalSettings.setFadeDuration(v),
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
            () => generalSettings.getDimIntensity(),
            (v) => generalSettings.setDimIntensity(v),
            1,
            0,
            100,
            '%',
            'How dark the black overlay should be, from transparent to fully black.',
        );
        this.add(darknessRow);

        this.#shortcutRow = new ShortcutCaptureRow(
            generalSettings,
            eventSubscriber,
            window,
            logger,
        );
        this.add(this.#shortcutRow);
    }

    dispose(): void {
        this.#shortcutRow.destroy();
    }

    _makeSwitchRow(
        title: string,
        getter: () => boolean,
        setter: (v: boolean) => void,
        subtitle: string,
    ): Adw.SwitchRow {
        const row = new Adw.SwitchRow({ title, subtitle });
        row.active = getter();
        void row.connect('notify::active', () => {
            setter(row.active);
        });
        return row;
    }

    _makeSpinRow(
        title: string,
        getter: () => number,
        setter: (v: number) => void,
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
            value: getter(),
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
        void row.connect('notify::value', () => {
            setter(row.value);
        });
        return row;
    }
}
