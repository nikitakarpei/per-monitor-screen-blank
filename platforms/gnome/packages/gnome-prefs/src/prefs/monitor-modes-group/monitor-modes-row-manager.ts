import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {
    MONITOR_MODES,
    type KnownMonitorEntry,
    type MonitorMode,
    getMonitorModeLabel,
} from '@pmsb/domain';
import { type LoggerPort } from '@pmsb/application';

interface MonitorModesRowManagerDeps {
    group: Adw.PreferencesGroup;
    onModeSelected: (monitorId: string, mode: MonitorMode) => void;
    logger: LoggerPort;
}

type RowEntry = {
    row: Adw.ComboRow;
    handlerId: number;
};

/**
 * Manages the lifecycle of monitor combo rows within a PreferencesGroup.
 * Handles row creation, removal, selection sync, and signal cleanup.
 */
export class MonitorModesRowManager {
    readonly #group: Adw.PreferencesGroup;
    readonly #logger: LoggerPort;
    readonly #onModeSelected: (monitorId: string, mode: MonitorMode) => void;

    readonly #rowsMap = new Map<string, RowEntry>();
    readonly #stringListModel: Gtk.StringList;
    #syncing = false;

    constructor(deps: MonitorModesRowManagerDeps) {
        this.#group = deps.group;
        this.#onModeSelected = deps.onModeSelected;
        this.#logger = deps.logger;

        const modeLabels = MONITOR_MODES.map((mode) =>
            getMonitorModeLabel(mode),
        );
        this.#stringListModel = Gtk.StringList.new(modeLabels);
    }

    syncRows(
        monitors: readonly KnownMonitorEntry[],
        monitorModes: Record<string, MonitorMode>,
    ): void {
        const currentMonitorIds = new Set(monitors.map((m) => m.monitorId));

        // Remove rows for monitors that are no longer present
        for (const monitorId of this.#rowsMap.keys()) {
            if (!currentMonitorIds.has(monitorId)) {
                this.#removeMonitorRow(monitorId);
            }
        }

        // Add or update rows for current monitors
        for (const monitor of monitors) {
            const currentMode = monitorModes[monitor.monitorId] ?? 'disabled';
            const selectedIndex = this.#modeToIndex(currentMode);

            const existingEntry = this.#rowsMap.get(monitor.monitorId);
            if (existingEntry) {
                // Update selection in-place using syncing flag to prevent handler triggering
                if (existingEntry.row.selected !== selectedIndex) {
                    this.#syncing = true;
                    existingEntry.row.selected = selectedIndex;
                    this.#syncing = false;
                }
            } else {
                this.#createMonitorRow(monitor, selectedIndex);
            }
        }
    }

    clearRows(): void {
        for (const monitorId of this.#rowsMap.keys()) {
            this.#removeMonitorRow(monitorId);
        }
    }

    #modeToIndex(mode: MonitorMode): number {
        const index = MONITOR_MODES.indexOf(mode);
        if (index === -1) {
            throw new Error(`Unknown monitor mode: ${mode}`);
        }
        return index;
    }

    #indexToMode(index: number): MonitorMode {
        const mode = MONITOR_MODES[index];
        if (!mode) {
            throw new Error(`Invalid monitor mode index: ${index}`);
        }
        return mode;
    }

    #createMonitorRow(monitor: KnownMonitorEntry, selectedIndex: number): void {
        const row = new Adw.ComboRow({ title: monitor.label });
        row.model = this.#stringListModel;

        // Set initial selection before connecting the signal to avoid triggering handler
        row.selected = selectedIndex;

        const handlerId = row.connect('notify::selected', () => {
            if (this.#syncing) return;
            this.#onModeSelected(
                monitor.monitorId,
                this.#indexToMode(row.selected),
            );
        });

        const entry: RowEntry = { row, handlerId };
        this.#rowsMap.set(monitor.monitorId, entry);
        this.#group.add(row);
    }

    #removeMonitorRow(monitorId: string): void {
        const entry = this.#rowsMap.get(monitorId);
        if (!entry) return;

        if (entry.handlerId !== -1) {
            try {
                entry.row.disconnect(entry.handlerId);
            } catch {
                this.#logger?.info(
                    'monitor row signal disconnect skipped: already detached',
                );
            }
        }
        try {
            this.#group.remove(entry.row);
        } catch {
            this.#logger?.info(
                'monitor row removal skipped: row already detached',
            );
        }
        this.#rowsMap.delete(monitorId);
    }
}
