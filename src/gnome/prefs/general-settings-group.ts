import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import { GSETTINGS_KEYS } from '../gsettings-schema-keys.js';
import { buildShortcutRow } from './shortcut-capture.js';
import {
    gobjectConnectObject,
    gobjectDisconnectObject,
    type SignalTarget,
} from '../shared/gobject-helpers.js';
import type { LoggerPort } from '../../util/logger.js';

interface BuildGeneralSettingsGroupParameters {
    settings: Gio.Settings;
    window: Gtk.Window;
    logger: LoggerPort;
}

interface GeneralSettingsGroupResult {
    group: Adw.PreferencesGroup;
    destroy(): void;
}

/**
 * Builds the General Settings preferences group.
 *
 * @param params - The parameters.
 * @param params.settings - The GSettings instance.
 * @param params.window - The preferences window.
 * @param params.logger - The logger instance.
 * @returns The group and cleanup function.
 */
export function buildGeneralSettingsGroup({
    settings,
    window,
    logger,
}: BuildGeneralSettingsGroupParameters): GeneralSettingsGroupResult {
    const group = new Adw.PreferencesGroup({
        title: 'General Settings',
    });

    // Blank after (idle timeout)
    const blankAfterRow = _makeSpinRow(
        settings,
        'Blank after',
        GSETTINGS_KEYS.idleTimeoutSeconds,
        1,
        1,
        3600,
        'seconds',
        'When a screen is set to Automatic, blank it after this much pointer inactivity.',
        group,
    );
    group.add(blankAfterRow);

    // Keep awake for
    const keepAwakeRow = _makeSpinRow(
        settings,
        'Keep awake for',
        GSETTINGS_KEYS.keepAwakeMinutes,
        1,
        1,
        1440,
        'minutes',
        'How long Keep Awake stays on before that screen returns to Automatic.',
        group,
    );
    group.add(keepAwakeRow);

    // Show quick settings menu
    const showQuickSettingsMenuRow = _makeSwitchRow(
        settings,
        'Show quick settings menu',
        GSETTINGS_KEYS.showQuickSettingsMenu,
        'Show an entry in the Quick Settings menu.',
        group,
    );
    group.add(showQuickSettingsMenuRow);

    // Show problem alerts
    const showAlertsRow = _makeSwitchRow(
        settings,
        'Show problem alerts',
        GSETTINGS_KEYS.showIssueNotifications,
        'Show a notification when something is not working as expected.',
        group,
    );
    group.add(showAlertsRow);

    // Do not blank the screen under the pointer
    const disableAutoTimerRow = _makeSwitchRow(
        settings,
        'Do not blank the screen under the pointer',
        GSETTINGS_KEYS.disableAutoTimerOnPointerMonitor,
        'Pause automatic blanking for the screen your pointer is currently on.',
        group,
    );
    group.add(disableAutoTimerRow);

    // Fade time
    const fadeTimeRow = _makeSpinRow(
        settings,
        'Fade time',
        GSETTINGS_KEYS.fadeDurationMs,
        10,
        0,
        5000,
        'ms',
        'How long the fade animation takes when the screen blacks out or wakes up.',
        group,
    );
    group.add(fadeTimeRow);

    // Darkness
    const darknessRow = _makeSpinRow(
        settings,
        'Darkness',
        GSETTINGS_KEYS.dimIntensityPercent,
        1,
        0,
        100,
        '%',
        'How dark the black overlay should be, from transparent to fully black.',
        group,
    );
    group.add(darknessRow);

    // Shortcut row - buildShortcutRow manages its own signal and UI
    const { row: shortcutRow, destroy: destroyShortcut } = buildShortcutRow(
        settings,
        window,
        logger,
    );
    group.add(shortcutRow);

    /**
     * Disconnects all signal handlers and cleans up.
     * Call this when the preferences window is destroyed.
     */
    function destroy(): void {
        // All widget signals auto-disconnect when group is destroyed.
        // settings outlives the group, so disconnect any signals connected with it.
        gobjectDisconnectObject(settings, group);
        destroyShortcut();
    }

    return {
        group,
        destroy,
    };
}

/**
 * Creates a switch row for a boolean GSettings key.
 *
 * @param settings - The GSettings instance.
 * @param title - The row title.
 * @param key - The GSettings key.
 * @param subtitle - The row subtitle/description.
 * @param holder - The holder object for automatic signal cleanup.
 * @returns The configured switch row.
 */
function _makeSwitchRow(
    settings: Gio.Settings,
    title: string,
    key: string,
    subtitle: string,
    holder: SignalTarget,
): Adw.SwitchRow {
    const row = new Adw.SwitchRow({ title, subtitle });
    row.active = settings.get_boolean(key);
    gobjectConnectObject(
        row,
        'notify::active',
        () => settings.set_boolean(key, row.active),
        holder,
    );
    return row;
}

/**
 * Creates a spin row for an integer GSettings key.
 *
 * @param settings - The GSettings instance.
 * @param title - The row title.
 * @param key - The GSettings key.
 * @param step - The step increment.
 * @param lower - The minimum value.
 * @param upper - The maximum value.
 * @param suffix - The unit suffix (e.g., 'seconds', 'minutes').
 * @param subtitle - The row subtitle/description.
 * @param holder - The holder object for automatic signal cleanup.
 * @returns The configured spin row.
 */
function _makeSpinRow(
    settings: Gio.Settings,
    title: string,
    key: string,
    step: number,
    lower: number,
    upper: number,
    suffix: string,
    subtitle: string,
    holder: SignalTarget,
): Adw.ActionRow {
    const row = new Adw.ActionRow({ title, subtitle });
    const adj = new Gtk.Adjustment({
        lower,
        upper,
        step_increment: step,
        page_increment: step * 10,
        value: settings.get_int(key),
    });
    const spin = new Gtk.SpinButton({
        adjustment: adj,
        numeric: true,
        valign: Gtk.Align.CENTER,
    });
    let label: Gtk.Label | undefined;
    if (suffix) {
        label = new Gtk.Label({ label: suffix, valign: Gtk.Align.CENTER });
    }
    gobjectConnectObject(
        spin,
        'value-changed',
        () => settings.set_int(key, spin.get_value_as_int()),
        holder,
    );
    row.add_suffix(spin);
    if (label) {
        row.add_suffix(label);
    }
    row.activatable_widget = spin;
    return row;
}
