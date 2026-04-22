import Gio from 'gi://Gio';
import { PlatformEventEmitter } from '../../app/ports/platform-events.js';
import { resolveMode, type MonitorMode } from '../../domain/monitor-mode.js';
import { ProfileId } from '../../domain/types.js';
import {
    gsettingsChangedSignal,
    PROFILE_GSETTINGS_KEYS,
} from '../gsettings-schema-keys.js';

interface ProfileStoreDeps {
    profileId: ProfileId;
    settings: Gio.Settings;
    eventEmitter: PlatformEventEmitter;
}

export class ProfileStore {
    readonly #profileId: ProfileId;
    readonly #settings: Gio.Settings;
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #signalConnections: number[] = [];
    #destroyed = false;
    #previousModes: Record<string, MonitorMode> = {};

    constructor(deps: ProfileStoreDeps) {
        this.#profileId = deps.profileId;
        this.#settings = deps.settings;
        this.#eventEmitter = deps.eventEmitter;
        this.#wireSignals();
        this.#previousModes = this.#getMonitorModes();
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

    #getMonitorModes(): Record<string, MonitorMode> {
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
                const newModes = this.#getMonitorModes();
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
