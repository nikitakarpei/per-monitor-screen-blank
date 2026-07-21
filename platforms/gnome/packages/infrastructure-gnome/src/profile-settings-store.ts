import type Gio from 'gi://Gio';
import { resolveMode } from '@pmsb/domain';
import type { ProfileId, MonitorMode } from '@pmsb/domain';
import type { Disposable } from '@pmsb/lifecycle';
import { PROFILE_GSETTINGS_KEYS } from './gsettings-schema-keys.js';
import { gsettingsChangedSignal } from './gsettings-signals.js';

type MonitorModeChange = {
    monitorId: string;
    mode: MonitorMode;
};

/**
 * Internal store for a single profile's settings.
 * Wraps a relocatable Gio.Settings instance for per-profile data.
 */
export class ProfileSettingsStore {
    readonly #profileId: ProfileId;
    readonly #settings: Gio.Settings;

    constructor(profileId: ProfileId, settings: Gio.Settings) {
        this.#profileId = profileId;
        this.#settings = settings;
    }

    get id(): ProfileId {
        return this.#profileId;
    }

    getName(): string {
        return this.#settings.get_string(PROFILE_GSETTINGS_KEYS.name);
    }

    setName(name: string): void {
        const saved = this.#settings.set_string(
            PROFILE_GSETTINGS_KEYS.name,
            name,
        );
        if (!saved) {
            throw new Error(`failed to set profile name to "${name}"`);
        }
    }

    getMonitorMode(monitorId: string): MonitorMode {
        const modes = this.#getMonitorModes();
        return resolveMode(modes[monitorId]);
    }

    getMonitorModes(): Record<string, MonitorMode> {
        return this.#getMonitorModes();
    }

    setMonitorMode(monitorId: string, mode: MonitorMode): void {
        const modes = this.#getMonitorModes();
        const newModes = Object.assign({}, modes, { [monitorId]: mode });
        const saved = this.#settings.set_string(
            PROFILE_GSETTINGS_KEYS.monitorModes,
            JSON.stringify(newModes),
        );
        if (!saved) {
            throw new Error(
                `failed to set monitor ${monitorId} mode to "${mode}"`,
            );
        }
    }

    setMonitorModes(modes: Record<string, MonitorMode>): void {
        const saved = this.#settings.set_string(
            PROFILE_GSETTINGS_KEYS.monitorModes,
            JSON.stringify(modes),
        );
        if (!saved) {
            throw new Error(
                `failed to set monitor modes for profile ${this.#profileId}`,
            );
        }
    }

    observeNameChanged(callback: (name: string) => void): Disposable {
        const connectionId = this.#settings.connect(
            gsettingsChangedSignal(PROFILE_GSETTINGS_KEYS.name),
            () => callback(this.getName()),
        );

        let disposed = false;
        return {
            dispose: (): void => {
                if (disposed) {
                    return;
                }

                disposed = true;
                this.#settings.disconnect(connectionId);
            },
        };
    }

    observeMonitorModeChanged(
        callback: (change: MonitorModeChange) => void,
    ): Disposable {
        let previousModes = this.#getMonitorModes();
        const connectionId = this.#settings.connect(
            gsettingsChangedSignal(PROFILE_GSETTINGS_KEYS.monitorModes),
            () => {
                const newModes = this.#getMonitorModes();
                for (const [monitorId, mode] of Object.entries(newModes)) {
                    if (previousModes[monitorId] !== mode) {
                        callback({ monitorId, mode });
                    }
                }
                previousModes = newModes;
            },
        );

        let disposed = false;
        return {
            dispose: (): void => {
                if (disposed) {
                    return;
                }

                disposed = true;
                this.#settings.disconnect(connectionId);
            },
        };
    }

    #getMonitorModes(): Record<string, MonitorMode> {
        const raw = this.#settings.get_string(
            PROFILE_GSETTINGS_KEYS.monitorModes,
        );
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return {};
        const result: Record<string, MonitorMode> = {};
        for (const [key, value] of Object.entries(
            parsed as Record<string, unknown>,
        )) {
            result[key] = resolveMode(value as MonitorMode);
        }
        return result;
    }
}
