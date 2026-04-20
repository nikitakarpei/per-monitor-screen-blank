import Gio from 'gi://Gio';
import type { PlatformEventEmitter } from '../../ports/index.js';
import { resolveMode, type MonitorMode } from '../../domain/monitor-mode.js';
import type { ProfileId } from '../../domain/ports-domain.js';
import {
    gsettingsChangedSignal,
    PROFILE_GSETTINGS_KEYS,
} from '../gsettings-schema-keys.js';

/**
 * GSettings wrapper for a single profile.
 * Emits events through PlatformEventEmitter when settings change.
 */
export class ProfileStore {
    readonly #profileId: ProfileId;
    readonly #settings: Gio.Settings;
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #signalConnections: number[] = [];
    #destroyed = false;
    #previousModes: Record<string, MonitorMode> = {};

    constructor(options: {
        profileId: ProfileId;
        settings: Gio.Settings;
        eventEmitter: PlatformEventEmitter;
    }) {
        this.#profileId = options.profileId;
        this.#settings = options.settings;
        this.#eventEmitter = options.eventEmitter;
        this.#wireSignals();
        this.#previousModes = this.#getMonitorModesMap();
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
        const modes = this.#getMonitorModesMap();
        return resolveMode(modes[monitorId]);
    }

    getMonitorModes(): Record<string, MonitorMode> {
        return this.#getMonitorModesMap();
    }

    setMonitorMode(monitorId: string, mode: MonitorMode): void {
        const modes = this.#getMonitorModesMap();
        const newModes = { ...modes, [monitorId]: mode };
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

    destroy(): void {
        if (this.#destroyed) {
            return;
        }
        this.#destroyed = true;
        for (const id of this.#signalConnections) {
            try {
                this.#settings.disconnect(id);
            } catch {
                // Ignore disconnect errors
            }
        }
        this.#signalConnections.length = 0;
        this.#previousModes = {};
    }

    #getMonitorModesMap(): Record<string, MonitorMode> {
        const raw = this.#settings.get_string(
            PROFILE_GSETTINGS_KEYS.monitorModes,
        );
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed !== 'object' || parsed === null) return {};
            const result: Record<string, MonitorMode> = {};
            for (const [key, value] of Object.entries(parsed)) {
                result[key] = resolveMode(value as MonitorMode);
            }
            return result;
        } catch {
            return {};
        }
    }

    #wireSignals(): void {
        const nameChangedId = this.#settings.connect(
            gsettingsChangedSignal(PROFILE_GSETTINGS_KEYS.name),
            () => {
                this.#eventEmitter.emit({
                    type: 'profile-name-changed',
                    payload: {
                        profileId: this.#profileId,
                        name: this.getName(),
                    },
                });
            },
        );
        this.#signalConnections.push(nameChangedId);

        const modesChangedId = this.#settings.connect(
            gsettingsChangedSignal(PROFILE_GSETTINGS_KEYS.monitorModes),
            () => {
                const newModes = this.#getMonitorModesMap();
                const previousModes = this.#previousModes;

                // Emit events for monitors with changed or new modes
                for (const [monitorId, mode] of Object.entries(newModes)) {
                    if (previousModes[monitorId] !== mode) {
                        this.#eventEmitter.emit({
                            type: 'monitor-mode-changed',
                            payload: {
                                profileId: this.#profileId,
                                monitorId,
                                mode,
                            },
                        });
                    }
                }

                this.#previousModes = newModes;
            },
        );
        this.#signalConnections.push(modesChangedId);
    }
}
