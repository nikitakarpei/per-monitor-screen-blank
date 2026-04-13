import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { buildMonitorLabel, monitorIdFromIndex } from './src/util/monitorIdentity.js';
import { normalizeMode, parseMonitorModes, stringifyMonitorModes } from './src/util/monitorModes.js';
import { createProfileId, ensureActiveProfileId, parseProfiles, stringifyProfiles } from './src/util/profileConfig.js';

export default class PerMonitorScreenBlankPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({ title: 'General' });
        const monitorGroup = new Adw.PreferencesGroup({ title: 'Per-monitor mode' });
        const globalGroup = new Adw.PreferencesGroup({ title: 'Global behavior' });
        const diagnosticsGroup = new Adw.PreferencesGroup({ title: 'Diagnostics' });
        const profilesGroup = new Adw.PreferencesGroup({ title: 'Profiles' });
        const monitorRows = [];
        const profileRows = [];

        globalGroup.add(this._makeSpinRow(settings, 'Idle timeout', 'idle-timeout-seconds', 1, 1, 3600, 'seconds'));
        globalGroup.add(this._makeSpinRow(settings, 'Keep awake', 'keep-awake-minutes', 1, 1, 1440, 'minutes'));
        globalGroup.add(this._makeSwitchRow(settings, 'Show indicator', 'show-indicator'));
        globalGroup.add(this._makeSwitchRow(settings, 'Wake on pointer entry', 'wake-on-pointer-entry'));
        globalGroup.add(this._makeSpinRow(settings, 'Fade duration', 'fade-duration-ms', 10, 0, 5000, 'ms'));
        diagnosticsGroup.add(this._makeButtonRow(
            'Open Extension Logs',
            'Open a terminal with live extension logs.',
            'Open',
            () => this._openExtensionLogs(window)
        ));

        const profileState = this._makeProfilesState(settings);
        const refreshUi = () => {
            this._clearDynamicRows(monitorGroup, monitorRows);
            this._clearDynamicRows(profilesGroup, profileRows);
            this._populateMonitorRows(settings, monitorGroup, profileState, refreshUi, monitorRows);
            this._populateProfilesRows(window, settings, profilesGroup, profileState, refreshUi, profileRows);
        };
        refreshUi();

        page.add(monitorGroup);
        page.add(globalGroup);
        page.add(diagnosticsGroup);
        page.add(profilesGroup);
        window.add(page);
    }

    _makeProfilesState(settings) {
        const profiles = parseProfiles(settings.get_string('profiles-json'));
        const activeProfileId = ensureActiveProfileId(profiles, settings.get_string('active-profile-id'));
        return { profiles, activeProfileId };
    }

    _populateProfilesRows(window, settings, group, state, onChanged, dynamicRows) {
        for (const profile of state.profiles) {
            const isActive = profile.id === state.activeProfileId;
            const row = new Adw.ActionRow({
                title: profile.name,
                subtitle: isActive ? 'Active profile' : null,
                activatable: true,
            });
            row.connect('activated', () => {
                if (isActive) return;
                state.activeProfileId = profile.id;
                settings.set_string('active-profile-id', profile.id);
                onChanged();
            });

            const menuButton = this._makeProfileMenuButton(window, settings, state, profile, onChanged);
            row.add_suffix(menuButton);
            row.activatable_widget = menuButton;
            group.add(row);
            dynamicRows.push(row);
        }

        const addRow = new Adw.ActionRow({
            title: 'Add Profile',
            subtitle: 'Create a new profile.',
            activatable: true,
        });
        addRow.connect('activated', () => {
            this._promptForProfileName(window, 'Create Profile', '', name => {
                const id = createProfileId(name, state.profiles);
                state.profiles.push({ id, name, monitorModes: {} });
                state.activeProfileId = id;
                settings.set_string('profiles-json', stringifyProfiles(state.profiles));
                settings.set_string('active-profile-id', id);
                onChanged();
            });
        });
        group.add(addRow);
        dynamicRows.push(addRow);
    }

    _populateMonitorRows(settings, group, state, onChanged, dynamicRows) {
        const modes = ['auto', 'disabled', 'keep-awake', 'manual-black'];
        const modeLabels = ['Auto', 'Disabled', 'Keep Awake', 'Manual Black'];
        const activeProfile = state.profiles.find(profile => profile.id === state.activeProfileId) ?? state.profiles[0];
        const monitorModes = parseMonitorModes(stringifyMonitorModes(activeProfile?.monitorModes ?? {}));
        const monitors = this._getMonitors();

        for (const monitor of monitors) {
            const row = new Adw.ComboRow({ title: monitor.label });
            row.model = Gtk.StringList.new(modeLabels);
            row.selected = Math.max(0, modes.indexOf(normalizeMode(monitorModes[monitor.id], 'disabled')));
            row.connect('notify::selected', () => {
                monitorModes[monitor.id] = modes[row.selected] ?? 'disabled';
                const nextProfiles = state.profiles.map(profile => {
                    if (profile.id !== state.activeProfileId) return profile;
                    return { ...profile, monitorModes: parseMonitorModes(stringifyMonitorModes(monitorModes)) };
                });
                state.profiles = nextProfiles;
                settings.set_string('profiles-json', stringifyProfiles(nextProfiles));
                onChanged();
            });
            group.add(row);
            dynamicRows.push(row);
        }

        if (monitors.length === 0) {
            const emptyRow = new Adw.ActionRow({
                title: 'No monitors detected',
                subtitle: 'Connect a monitor and reopen preferences.',
            });
            group.add(emptyRow);
            dynamicRows.push(emptyRow);
        }
    }

    _getMonitors() {
        const monitors = [];
        const display = Gdk.Display.get_default();
        const list = display?.get_monitors?.();
        const count = list?.get_n_items?.() ?? 0;

        for (let i = 0; i < count; i += 1) {
            const monitor = list.get_item(i);
            const manufacturer = monitor?.get_manufacturer?.()?.trim?.() ?? '';
            const model = monitor?.get_model?.()?.trim?.() ?? '';
            const connector = monitor?.get_connector?.()?.trim?.() ?? '';
            monitors.push({
                id: monitorIdFromIndex(i),
                label: buildMonitorLabel({
                    ordinal: i + 1,
                    manufacturer,
                    model,
                    connector,
                    isPrimary: monitor?.is_primary?.() ?? false,
                }),
            });
        }

        return monitors;
    }

    _makeSwitchRow(settings, title, key) {
        const row = new Adw.SwitchRow({ title });
        row.active = settings.get_boolean(key);
        row.connect('notify::active', () => settings.set_boolean(key, row.active));
        return row;
    }

    _makeSpinRow(settings, title, key, step, lower, upper, suffix) {
        const row = new Adw.ActionRow({ title });
        const adj = new Gtk.Adjustment({ lower, upper, step_increment: step, page_increment: step * 10, value: settings.get_int(key) });
        const spin = new Gtk.SpinButton({ adjustment: adj, numeric: true, valign: Gtk.Align.CENTER });
        const label = suffix ? new Gtk.Label({ label: suffix, valign: Gtk.Align.CENTER }) : null;
        spin.connect('value-changed', () => settings.set_int(key, spin.get_value_as_int()));
        row.add_suffix(spin);
        if (label)
            row.add_suffix(label);
        row.activatable_widget = spin;
        return row;
    }

    _makeButtonRow(title, subtitle, buttonLabel, onClicked, disabled = false) {
        const row = new Adw.ActionRow({ title, subtitle });
        const button = new Gtk.Button({ label: buttonLabel, valign: Gtk.Align.CENTER });
        button.sensitive = !disabled;
        button.connect('clicked', onClicked);
        row.add_suffix(button);
        row.activatable_widget = button;
        return row;
    }

    _makeProfileMenuButton(window, settings, state, profile, onChanged) {
        const menuButton = new Gtk.MenuButton({
            icon_name: 'open-menu-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Profile actions',
        });
        const popover = new Gtk.Popover();
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 8,
            margin_end: 8,
        });
        popover.set_child(box);
        menuButton.set_popover(popover);

        const rename = new Gtk.Button({ label: 'Rename' });
        rename.connect('clicked', () => {
            popover.popdown();
            this._promptForProfileName(window, 'Rename Profile', profile.name, name => {
                state.profiles = state.profiles.map(item => item.id === profile.id ? { ...item, name } : item);
                settings.set_string('profiles-json', stringifyProfiles(state.profiles));
                onChanged();
            });
        });
        box.append(rename);

        const duplicate = new Gtk.Button({ label: 'Duplicate' });
        duplicate.connect('clicked', () => {
            popover.popdown();
            const duplicateName = `${profile.name} Copy`;
            const id = createProfileId(duplicateName, state.profiles);
            state.profiles.push({ ...profile, id, name: duplicateName });
            state.activeProfileId = id;
            settings.set_string('profiles-json', stringifyProfiles(state.profiles));
            settings.set_string('active-profile-id', id);
            onChanged();
        });
        box.append(duplicate);

        const canDelete = state.profiles.length > 1;
        const remove = new Gtk.Button({ label: 'Delete' });
        remove.sensitive = canDelete;
        remove.connect('clicked', () => {
            if (!canDelete) return;
            popover.popdown();
            state.profiles = state.profiles.filter(item => item.id !== profile.id);
            state.activeProfileId = ensureActiveProfileId(state.profiles, state.activeProfileId);
            settings.set_string('profiles-json', stringifyProfiles(state.profiles));
            settings.set_string('active-profile-id', state.activeProfileId);
            onChanged();
        });
        box.append(remove);

        return menuButton;
    }

    _promptForProfileName(window, title, initialValue, onAccept) {
        const dialog = new Adw.MessageDialog({
            transient_for: window,
            heading: title,
            body: 'Enter a profile name.',
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

        dialog.connect('response', (_dialog, response) => {
            if (response === 'ok') {
                const value = entry.get_text().trim();
                if (value) onAccept(value);
            }
            dialog.destroy();
        });
        dialog.present();
    }

    _clearDynamicRows(group, rows) {
        for (const row of rows.splice(0)) {
            try {
                group.remove(row);
            } catch (_) {
                // Row might already be detached; ignore.
            }
        }
    }

    _openExtensionLogs(window) {
        /* journalctl --grep matches MESSAGE text; covers log tag and bracket prefix without bash/rg. */
        const journalArgv = [
            'journalctl', '--user', '-f', '--no-pager',
            '-g', 'per-monitor-screen-blank',
        ];
        const terminalArgvs = [
            ['gnome-terminal', '--', ...journalArgv],
            ['kgx', '--', ...journalArgv],
            ['ptyxis', '--', ...journalArgv],
        ];

        for (const argv of terminalArgvs) {
            try {
                GLib.spawn_async(
                    null,
                    argv,
                    null,
                    GLib.SpawnFlags.SEARCH_PATH,
                    null,
                );
                return;
            } catch (err) {
                console.warn('[per-monitor-screen-blank] prefs: terminal launch failed', argv[0], err);
            }
        }

        const manual = 'journalctl --user -f --no-pager -g per-monitor-screen-blank';
        const dialog = new Adw.MessageDialog({
            transient_for: window,
            heading: 'Unable to open terminal',
            body: `Run this command manually:\n\n${manual}`,
        });
        dialog.add_response('ok', 'OK');
        dialog.set_default_response('ok');
        dialog.connect('response', () => dialog.destroy());
        dialog.present();
    }

}
