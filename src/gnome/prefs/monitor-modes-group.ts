import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import type Gio from 'gi://Gio';
import {
    MonitorIdentityStore,
    type KnownMonitorEntry,
} from '../shared/monitor-identity-store.js';
import { getMonitorModeLabel } from '../../domain/monitor-mode-labels.js';
import { resolveMonitorMode } from '../../domain/monitor-identity.js';
import type { ProfileRegistry } from '../shared/profile-registry.js';
import {
    MONITOR_MODES,
    resolveMode,
    type MonitorMode,
} from '../../domain/monitor-mode.js';
import type { Logger } from '../../util/logger.js';
import {
    GSETTINGS_KEYS,
    gsettingsChangedSignal,
} from '../gsettings-schema-keys.js';

interface BuildMonitorModesGroupParameters {
    settings: Gio.Settings;
    profileRegistry: ProfileRegistry;
    logger: Logger;
    identityStore: MonitorIdentityStore;
}

interface BuildMonitorModesGroupResult {
    group: Adw.PreferencesGroup;
    refresh(): void;
    destroy(): void;
}

/**
 * Creates a PreferencesGroup containing combo rows for configuring each monitor's mode.
 * This extracts the monitor modes UI construction from the main preferences module.
 */
export function buildMonitorModesGroup({
    settings,
    profileRegistry,
    logger,
    identityStore,
}: BuildMonitorModesGroupParameters): BuildMonitorModesGroupResult {
    const group = new Adw.PreferencesGroup({
        title: 'Monitor Modes',
    });

    const modes = MONITOR_MODES;
    const modeLabels = modes.map((mode) => getMonitorModeLabel(mode));
    const stringListModel = Gtk.StringList.new(modeLabels);

    // Map of monitorId -> row entry for active monitor rows
    const rowsMap = new Map<string, RowEntry>();
    // Track placeholder row separately (either "no profile" or "no monitors")
    let placeholderEntry: Adw.ActionRow | undefined = undefined;
    // Guard flag to suppress notify::selected callbacks during programmatic updates
    let isUpdating = false;

    function removePlaceholder(): void {
        if (placeholderEntry) {
            try {
                group.remove(placeholderEntry);
            } catch {
                logger?.info('placeholder removal skipped: already detached');
            }
            placeholderEntry = undefined;
        }
    }

    function addNoProfilePlaceholder(): void {
        removePlaceholder();
        const row = new Adw.ActionRow({
            title: 'No profile available',
            subtitle: 'Create a profile to configure monitor modes.',
        });
        group.add(row);
        placeholderEntry = row;
    }

    function addNoMonitorsPlaceholder(): void {
        removePlaceholder();
        const row = new Adw.ActionRow({
            title: 'No screens found',
            subtitle: 'Connect a screen and reopen Settings.',
        });
        group.add(row);
        placeholderEntry = row;
    }

    function removeMonitorRow(monitorId: string): void {
        const entry = rowsMap.get(monitorId);
        if (!entry) return;

        if (entry.handlerId !== -1) {
            try {
                entry.row.disconnect(entry.handlerId);
            } catch {
                logger?.info(
                    'monitor row signal disconnect skipped: already detached',
                );
            }
        }
        try {
            group.remove(entry.row);
        } catch {
            logger?.info('monitor row removal skipped: row already detached');
        }
        rowsMap.delete(monitorId);
    }

    function clearAllMonitorRows(): void {
        for (const monitorId of rowsMap.keys()) {
            removeMonitorRow(monitorId);
        }
    }

    function createMonitorRow(
        monitor: KnownMonitorEntry,
        selectedIndex: number,
    ): void {
        const row = new Adw.ComboRow({ title: monitor.label });
        row.model = stringListModel;

        // Set initial selection before connecting the signal to avoid triggering handler
        row.selected = selectedIndex;

        const handlerId = row.connect('notify::selected', () => {
            if (isUpdating) return;
            const selectedMode: MonitorMode = resolveMode(modes[row.selected]);
            const currentActiveId = profileRegistry.getActiveProfileId();
            const currentStore =
                profileRegistry.getProfileSettings(currentActiveId);
            currentStore?.setMonitorMode(monitor.monitorId, selectedMode);
        });

        const entry: RowEntry = { row, handlerId };
        rowsMap.set(monitor.monitorId, entry);
        group.add(row);
    }

    /**
     * Refreshes monitor rows by diffing against current state.
     * Adds new rows, removes gone rows, updates changed selections in-place.
     */
    function refresh(): void {
        const activeId = profileRegistry.getActiveProfileId();
        const store = profileRegistry.getProfileSettings(activeId);

        // Handle no profile case
        if (!store) {
            clearAllMonitorRows();
            addNoProfilePlaceholder();
            return;
        }

        const monitorModes = store.getMonitorModes();

        // Load current monitors from GSettings via identity store
        const monitors: KnownMonitorEntry[] = identityStore.load();

        // Handle no monitors case
        if (monitors.length === 0) {
            clearAllMonitorRows();
            addNoMonitorsPlaceholder();
            return;
        }

        // Remove placeholder since we have both profile and monitors
        removePlaceholder();

        // Build set of current monitor IDs for quick lookup
        const currentMonitorIds = new Set(monitors.map((m) => m.monitorId));

        // Remove rows for monitors that are no longer present
        for (const monitorId of rowsMap.keys()) {
            if (!currentMonitorIds.has(monitorId)) {
                removeMonitorRow(monitorId);
            }
        }

        // Add or update rows for current monitors
        for (const monitor of monitors) {
            const currentMode = resolveMonitorMode(
                monitorModes,
                monitor.monitorId,
            );
            const selectedIndex = Math.max(0, modes.indexOf(currentMode));

            const existingEntry = rowsMap.get(monitor.monitorId);
            if (existingEntry) {
                // Update selection in-place without triggering handler
                if (existingEntry.row.selected !== selectedIndex) {
                    isUpdating = true;
                    existingEntry.row.selected = selectedIndex;
                    isUpdating = false;
                }
            } else {
                // Create new row
                createMonitorRow(monitor, selectedIndex);
            }
        }
    }

    // Initial population
    refresh();

    // Connect to known-monitors changes to refresh the UI when monitors change
    const knownMonitorsChangedHandlerId = settings.connect(
        gsettingsChangedSignal(GSETTINGS_KEYS.knownMonitors),
        () => {
            logger?.info('known-monitors changed, refreshing monitor list');
            refresh();
        },
    );

    // Subscribe to monitor mode changes to refresh when monitor modes are changed
    const unsubscribeMonitorModeChanged = profileRegistry.onMonitorModeChanged(
        () => {
            logger?.info('monitor mode changed, refreshing monitor modes');
            refresh();
        },
    );

    // Disconnects all signal handlers and removes all rows.
    function destroy(): void {
        if (knownMonitorsChangedHandlerId !== 0) {
            try {
                settings.disconnect(knownMonitorsChangedHandlerId);
            } catch {
                logger?.info(
                    'known-monitors signal disconnect skipped: already detached',
                );
            }
        }
        unsubscribeMonitorModeChanged();

        // Disconnect and remove all monitor rows
        for (const monitorId of rowsMap.keys()) {
            removeMonitorRow(monitorId);
        }

        // Remove placeholder if present
        removePlaceholder();
    }

    return { group, refresh, destroy };
}

interface RowEntry {
    row: Adw.ComboRow;
    handlerId: number;
}
