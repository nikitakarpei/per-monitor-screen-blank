import Gio from 'gi://Gio';
import { GSETTINGS_KEYS } from '../gsettings-schema-keys.js';
import { Logger } from '../../util/logger.js';
import { MonitorIdentityPersistence } from '../../ports/index.js';

export interface KnownMonitorEntry {
    monitorId: string;
    label: string;
}

interface MonitorIdentityStoreOptions {
    settings: Gio.Settings;
    logger: Logger;
}

export class MonitorIdentityStore implements MonitorIdentityPersistence {
    private readonly settings: Gio.Settings;
    private readonly logger: Logger;

    constructor(options: MonitorIdentityStoreOptions) {
        this.settings = options.settings;
        this.logger = options.logger;
    }

    /** Read all known monitor entries from GSettings */
    load(): KnownMonitorEntry[] {
        try {
            const jsonString = this.settings.get_string(
                GSETTINGS_KEYS.knownMonitors,
            );
            if (!jsonString || jsonString === '') {
                return [];
            }
            const parsed = JSON.parse(jsonString);
            if (!Array.isArray(parsed)) {
                this.logger.warn(
                    'known-monitors value is not an array, returning empty',
                );
                return [];
            }
            return parsed as KnownMonitorEntry[];
        } catch (parseError) {
            this.logger.warn(
                `Failed to parse known-monitors: ${String(parseError)}`,
            );
            return [];
        }
    }

    /** Write all known monitor entries to GSettings */
    save(entries: KnownMonitorEntry[]): void {
        const jsonString = JSON.stringify(entries);
        const saved = this.settings.set_string(
            GSETTINGS_KEYS.knownMonitors,
            jsonString,
        );
        if (!saved) {
            this.logger.warn('failed to save known-monitors to gsettings');
        }
    }

    /** Add or update a single monitor entry (upsert by monitorId) */
    upsert(entry: KnownMonitorEntry): void {
        const entries = this.load();
        const existingIndex = entries.findIndex(
            (knownMonitorEntry) =>
                knownMonitorEntry.monitorId === entry.monitorId,
        );
        if (existingIndex === -1) {
            entries.push(entry);
        } else {
            entries[existingIndex] = entry;
        }
        this.save(entries);
    }

    /** Remove a monitor entry by monitorId */
    remove(monitorId: string): void {
        const entries = this.load();
        const filtered = entries.filter(
            (knownMonitorEntry) => knownMonitorEntry.monitorId !== monitorId,
        );
        if (filtered.length !== entries.length) {
            this.save(filtered);
        }
    }
}
