import Gio from 'gi://Gio';
import { GSETTINGS_KEYS } from '../gsettings-schema-keys.js';
import { type MonitorIdentityStore } from '@pmsb/application';
import { GjsLogger } from '../../gjs-logger.js';

interface MonitorIdentityStoreDeps {
    settings: Gio.Settings;
    logger: GjsLogger;
}

export interface KnownMonitorEntry {
    monitorId: string;
    label: string;
}

export class GnomeMonitorIdentityStore implements MonitorIdentityStore {
    private readonly settings: Gio.Settings;
    private readonly logger: GjsLogger;

    constructor(deps: MonitorIdentityStoreDeps) {
        this.settings = deps.settings;
        this.logger = deps.logger;
    }

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

    listIds(): readonly string[] {
        return this.load().map((entry) => entry.monitorId);
    }

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
