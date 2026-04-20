import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import type { ProfileRegistry } from '../shared/profile-registry.js';
import type { ProfileStore } from '../shared/profile-store.js';
import type { MonitorMode } from '../../domain/monitor-mode.js';
import type { LoggerPort } from '../../util/logger.js';
import { promptForProfileName } from './profile-name-dialog.js';
import {
    gobjectConnectObject,
    gobjectDisconnectAllForHolder,
    type SignalTarget,
} from '../shared/gobject-helpers.js';

/**
 * Generate a unique profile ID.
 * @returns A unique profile ID (random UUID)
 */
function generateId(): string {
    return GLib.uuid_string_random();
}

interface Profile {
    id: string;
    name: string;
    monitorModes: Record<string, MonitorMode>;
}

/**
 * Build a Profile object from registry data.
 * @param registry - The profile registry
 * @param id - Profile ID
 * @returns The profile object or undefined
 */
function buildProfile(
    registry: ProfileRegistry,
    id: string,
): Profile | undefined {
    const store: ProfileStore | undefined = registry.getProfileSettings(id);
    return store
        ? {
              id,
              name: store.getName(),
              monitorModes: store.getMonitorModes(),
          }
        : undefined;
}

/**
 * Get all profiles from the registry.
 * @param registry - The profile registry
 * @returns Array of all profiles
 */
function getAllProfiles(registry: ProfileRegistry): Profile[] {
    return registry
        .getProfileIds()
        .map((id) => buildProfile(registry, id))
        .filter((p): p is Profile => p !== undefined);
}

/**
 * Get the active profile from the registry.
 * @param registry - The profile registry
 * @returns The active profile or undefined
 */
function getActiveProfile(registry: ProfileRegistry): Profile | undefined {
    const activeId = registry.getActiveProfileId();
    return activeId ? buildProfile(registry, activeId) : undefined;
}

interface BuildProfilesGroupOptions {
    settings: Gio.Settings;
    profileRegistry: ProfileRegistry;
    window: Gtk.Window;
    onChanged: () => void;
    addRefresh?: (callback: () => void) => void;
    logger?: LoggerPort;
}

interface ProfilesGroupResult {
    group: Adw.PreferencesGroup;
    refresh: () => void;
    destroy: () => void;
}

/**
 * Creates the profiles/presets preferences group with profile management UI.
 *
 * @param options - Configuration options
 * @returns The group and control functions
 */
export function buildProfilesGroup({
    profileRegistry,
    window,
    onChanged,
    logger,
}: BuildProfilesGroupOptions): ProfilesGroupResult {
    const group = new Adw.PreferencesGroup({
        title: 'Presets',
        description:
            'Manage monitor configuration presets. Click a preset to activate it.',
    });

    const profileRows: Adw.ActionRow[] = [];

    function clearProfileRows(): void {
        gobjectDisconnectAllForHolder(group);

        for (const row of profileRows.splice(0)) {
            try {
                group.remove(row);
            } catch {
                logger?.info(
                    'preferences profile row removal skipped: row already detached',
                );
            }
        }
    }

    /**
     * Build and add profile action rows for each profile.
     */
    function buildProfileRows(): void {
        const profiles = getAllProfiles(profileRegistry);
        const activeProfile = getActiveProfile(profileRegistry);
        const activeProfileId = activeProfile?.id;

        for (const profile of profiles) {
            const isActive = profile.id === activeProfileId;
            const row = new Adw.ActionRow({
                title: profile.name,
                subtitle: isActive ? 'Currently in use' : '',
                activatable: true,
            });

            // Drag handle for reordering (visual indicator)
            const dragHandle = new Gtk.Image({
                icon_name: 'list-drag-handle-symbolic',
                valign: Gtk.Align.CENTER,
                margin_end: 8,
            });

            row.add_prefix(dragHandle);

            // Activate profile on row click - use connectObject with group as holder
            gobjectConnectObject(
                row,
                'activated',
                () => {
                    if (isActive) return;
                    profileRegistry.setActiveProfileId(profile.id);
                    onChanged();
                },
                group,
            );

            const menuButton = _makeProfileMenuButton({
                window,
                profileRegistry,
                profile,
                onChanged,
                logger,
                holder: group,
            });

            row.add_suffix(menuButton);
            row.activatable_widget = menuButton;

            group.add(row);
            profileRows.push(row);
        }
    }

    /**
     * Build the "Add new preset" row.
     */
    function buildAddRow(): void {
        const addRow = new Adw.ActionRow({
            title: 'Add Preset',
            subtitle: 'Save another monitor setup.',
            activatable: true,
        });

        // Use connectObject with group as holder
        gobjectConnectObject(
            addRow,
            'activated',
            () => {
                promptForProfileName(window, 'Create Preset', '', (name) => {
                    if (name) {
                        const newId = generateId();
                        // ProfileStore return from createProfile must be used or explicitly discarded
                        const newStore = profileRegistry.createProfile(
                            newId,
                            name,
                        );
                        if (newStore) {
                            profileRegistry.setActiveProfileId(newId);
                            onChanged();
                        } else {
                            logger?.warn(
                                `failed to create profile ${newId}: store creation failed`,
                            );
                        }
                    }
                });
            },
            group,
        );

        group.add(addRow);
        profileRows.push(addRow);
    }

    /**
     * Refresh the entire profiles UI.
     */
    function refresh(): void {
        clearProfileRows();
        buildProfileRows();
        buildAddRow();
    }

    function destroy(): void {
        clearProfileRows();
    }

    // Initial build
    refresh();

    return { group, refresh, destroy };
}

interface MenuButtonOptions {
    window: Gtk.Window;
    profileRegistry: ProfileRegistry;
    profile: Profile;
    onChanged: () => void;
    logger?: LoggerPort;
    holder: SignalTarget;
}

/**
 * Creates a menu button with actions for a profile (rename, duplicate, delete).
 *
 * @param options - Configuration options
 * @returns The configured menu button (Gtk.MenuButton)
 */
function _makeProfileMenuButton({
    window,
    profileRegistry,
    profile,
    onChanged,
    logger,
    holder,
}: MenuButtonOptions): Gtk.MenuButton {
    const menuButton = new Gtk.MenuButton({
        icon_name: 'open-menu-symbolic',
        valign: Gtk.Align.CENTER,
        tooltip_text: 'Preset actions',
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

    // Rename action - use connectObject with holder
    const rename = new Gtk.Button({ label: 'Rename' });
    gobjectConnectObject(
        rename,
        'clicked',
        () => {
            popover.popdown();
            promptForProfileName(
                window,
                'Rename Preset',
                profile.name,
                (name) => {
                    if (name) {
                        const store = profileRegistry.getProfileSettings(
                            profile.id,
                        );
                        if (store) {
                            store.setName(name);
                            onChanged();
                        } else {
                            logger?.warn(
                                `cannot rename profile ${profile.id}: store not found`,
                            );
                        }
                    }
                },
            );
        },
        holder,
    );
    box.append(rename);

    // Duplicate action - use connectObject with holder
    const duplicate = new Gtk.Button({ label: 'Duplicate' });
    gobjectConnectObject(
        duplicate,
        'clicked',
        () => {
            popover.popdown();
            const sourceStore = profileRegistry.getProfileSettings(profile.id);
            if (!sourceStore) {
                logger?.warn(
                    `cannot duplicate profile ${profile.id}: source not found`,
                );
                return;
            }
            const newId = generateId();
            const sourceName = sourceStore.getName();
            const sourceModes = sourceStore.getMonitorModes();
            const initialModes = new Map<string, MonitorMode>(
                Object.entries(sourceModes),
            );
            const newStore = profileRegistry.createProfile(
                newId,
                `${sourceName} (copy)`,
                initialModes,
            );
            if (!newStore) {
                logger?.warn(
                    `cannot duplicate profile: failed to create profile ${newId}`,
                );
                return;
            }
            profileRegistry.setActiveProfileId(newId);
            onChanged();
        },
        holder,
    );
    box.append(duplicate);

    // Delete action - use connectObject with holder
    const profiles = getAllProfiles(profileRegistry);
    const canDelete = profiles.length > 1;
    const remove = new Gtk.Button({ label: 'Delete' });
    remove.sensitive = canDelete;
    gobjectConnectObject(
        remove,
        'clicked',
        () => {
            if (!canDelete) return;
            popover.popdown();
            // deleteProfile return (boolean) indicates success/failure; log on failure
            const deleted = profileRegistry.deleteProfile(profile.id);
            if (!deleted) {
                logger?.warn(`failed to delete profile ${profile.id}`);
            }
            onChanged();
        },
        holder,
    );
    box.append(remove);

    return menuButton;
}
