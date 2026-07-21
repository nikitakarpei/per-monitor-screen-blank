import type Gio from 'gi://Gio';
import type { Disposable } from '@pmsb/lifecycle';
import { GSETTINGS_KEYS } from './gsettings-schema-keys.js';
import type { MonitorIdentityStore } from '@pmsb/application';
import { gsettingsChangedSignal } from './gsettings-signals.js';
import type { KnownMonitorEntry } from '@pmsb/domain';

type KnownMonitorsChange = readonly KnownMonitorEntry[];

export class GnomeMonitorIdentityStore implements MonitorIdentityStore {
    readonly #settings: Gio.Settings;

    constructor(settings: Gio.Settings) {
        this.#settings = settings;
    }

    load(): KnownMonitorEntry[] {
        return this.#readKnownMonitors();
    }

    observeKnownMonitorsChanged(
        callback: (knownMonitors: KnownMonitorsChange) => void,
    ): Disposable {
        const connectionId = this.#settings.connect(
            gsettingsChangedSignal(GSETTINGS_KEYS.knownMonitors),
            () => callback(this.#readKnownMonitors()),
        );

        let disposed = false;
        return {
            dispose: () => {
                if (disposed) {
                    return;
                }

                disposed = true;
                this.#settings.disconnect(connectionId);
            },
        };
    }

    #readKnownMonitors(): KnownMonitorEntry[] {
        try {
            const jsonString = this.#settings.get_string(
                GSETTINGS_KEYS.knownMonitors,
            );
            if (!jsonString || jsonString === '') {
                return [];
            }
            const parsed: unknown = JSON.parse(jsonString);
            if (!Array.isArray(parsed)) {
                throw new TypeError('known-monitors value is not an array');
            }
            return parsed as KnownMonitorEntry[];
        } catch (error) {
            throw new Error(`Failed to parse known-monitors`, { cause: error });
        }
    }

    save(entries: KnownMonitorEntry[]): void {
        const jsonString = JSON.stringify(entries);
        const saved = this.#settings.set_string(
            GSETTINGS_KEYS.knownMonitors,
            jsonString,
        );
        if (!saved) {
            throw new Error('failed to save known-monitors to gsettings');
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

    list(): readonly KnownMonitorEntry[] {
        return this.load();
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
