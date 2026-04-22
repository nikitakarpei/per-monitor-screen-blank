import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { PlatformEventEmitter } from '../../app/ports/platform-events.js';
import { Profile, ProfileId } from '../../domain/types.js';
import { MonitorMode } from '../../domain/monitor-mode.js';
import {
    GSETTINGS_KEYS,
    gsettingsChangedSignal,
} from '../gsettings-schema-keys.js';
import { ProfileStore } from './profile-store.js';

interface ProfileRegistryDeps {
    settings: Gio.Settings;
    eventEmitter: PlatformEventEmitter;
    createProfileSettings: (profileId: ProfileId) => Gio.Settings;
}

/**
 * Manages lifecycle of per-profile GSettings instances.
 * Creates/destroys ProfileStore instances as profiles are added/removed.
 */
export class ProfileRegistry {
    readonly #settings: Gio.Settings;
    readonly #eventEmitter: PlatformEventEmitter;

    readonly #gsettingsFactory: (_profileId: ProfileId) => Gio.Settings;
    readonly #profileStores = new Map<ProfileId, ProfileStore>();
    readonly #pendingCreatedIds = new Set<ProfileId>();
    readonly #signalConnections: number[] = [];
    #destroyed = false;
    #started = false;

    constructor(deps: ProfileRegistryDeps) {
        this.#settings = deps.settings;
        this.#eventEmitter = deps.eventEmitter;
        this.#gsettingsFactory = (profileId: ProfileId) => {
            return deps.createProfileSettings(profileId);
        };
    }

    start(): void {
        if (this.#started) {
            return;
        }
        this.#started = true;
        this.#syncProfileStores();
        this.#wireMainSignals();
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

        for (const store of this.#profileStores.values()) {
            store.destroy();
        }
        this.#profileStores.clear();
        this.#pendingCreatedIds.clear();
    }

    createProfile(
        name: string,
        initialModes?: Record<string, MonitorMode>,
    ): ProfileStore {
        const id = this.#generateId();

        const store = new ProfileStore({
            profileId: id,
            settings: this.#gsettingsFactory(id),
            eventEmitter: this.#eventEmitter,
        });

        store.setName(name);
        if (initialModes) {
            for (const [monitorId, mode] of Object.entries(initialModes)) {
                store.setMonitorMode(monitorId, mode);
            }
        }

        const profileIds = this.#settings.get_strv(GSETTINGS_KEYS.profileIds);

        const newIds = [...profileIds, id];
        const saved = this.#settings.set_strv(
            GSETTINGS_KEYS.profileIds,
            newIds,
        );
        if (!saved) {
            throw new Error(`failed to add profile ${id} to profile-ids list`);
        }

        this.#profileStores.set(id, store);
        this.#pendingCreatedIds.add(id);

        return store;
    }

    deleteProfile(id: ProfileId): void {
        const store = this.#profileStores.get(id);
        if (!store) {
            throw new Error(`profile ${id} not found`);
        }
        store.destroy();
        this.#profileStores.delete(id);

        // Remove from profile-ids list
        const profileIds = this.#settings.get_strv(GSETTINGS_KEYS.profileIds);
        const index = profileIds.indexOf(id);
        if (index !== -1) {
            const newIds = profileIds.filter((_, index_) => index_ !== index);
            const saved = this.#settings.set_strv(
                GSETTINGS_KEYS.profileIds,
                newIds,
            );
            if (!saved) {
                throw new Error(
                    `failed to remove profile ${id} from profile-ids list`,
                );
            }
        }

        // If this was the active profile, switch to another
        const activeId = this.getActiveProfileId();
        if (activeId === id) {
            const remainingIds = this.getProfileIds();
            if (remainingIds.length > 0) {
                this.setActiveProfileId(remainingIds[0]!);
            } else {
                const cleared = this.#settings.set_string(
                    GSETTINGS_KEYS.activeProfileId,
                    '',
                );
                if (!cleared) {
                    throw new Error(
                        `failed to clear active profile id after deleting ${id}`,
                    );
                }
            }
        }
    }

    getProfileStore(id: ProfileId): ProfileStore | undefined {
        return this.#profileStores.get(id);
    }

    getProfileIds(): ProfileId[] {
        return this.#settings.get_strv(GSETTINGS_KEYS.profileIds);
    }

    getActiveProfileId(): ProfileId {
        return this.#settings.get_string(GSETTINGS_KEYS.activeProfileId);
    }

    getProfile(id: ProfileId): Profile | undefined {
        const store = this.#profileStores.get(id);
        if (!store) {
            return undefined;
        }
        return {
            id: store.id,
            name: store.getName(),
            monitorModes: store.getMonitorModes(),
        };
    }

    getAllProfiles(): Profile[] {
        return [...this.#profileStores.values()].map((store) => ({
            id: store.id,
            name: store.getName(),
            monitorModes: store.getMonitorModes(),
        }));
    }

    getActiveProfile(): Profile | undefined {
        const activeId = this.getActiveProfileId();
        if (!activeId) {
            return undefined;
        }
        return this.getProfile(activeId);
    }

    setActiveProfileId(id: ProfileId): void {
        const oldId = this.getActiveProfileId();
        if (oldId === id) {
            return;
        }

        const profileIds = this.getProfileIds();
        if (!profileIds.includes(id)) {
            throw new Error(`Profile ${id} does not exist`);
        }

        const saved = this.#settings.set_string(
            GSETTINGS_KEYS.activeProfileId,
            id,
        );
        if (!saved) {
            throw new Error(`failed to set active profile id to ${id}`);
        }
    }

    ensureDefaultProfile(): void {
        const profileIds = this.getProfileIds();
        if (profileIds.length === 0) {
            const store = this.createProfile('Default');
            this.setActiveProfileId(store.id);
        }
    }

    #generateId(): string {
        return GLib.uuid_string_random();
    }

    #syncProfileStores(): void {
        const profileIds = this.getProfileIds();

        // Remove stores for deleted profiles
        for (const [id, store] of this.#profileStores.entries()) {
            if (!profileIds.includes(id)) {
                store.destroy();
                this.#profileStores.delete(id);
            }
        }

        // Create stores for new profiles
        for (const id of profileIds) {
            if (!this.#profileStores.has(id)) {
                const store = new ProfileStore({
                    profileId: id,
                    settings: this.#gsettingsFactory(id),
                    eventEmitter: this.#eventEmitter,
                });
                this.#profileStores.set(id, store);
            }
        }
    }

    #wireMainSignals(): void {
        const profileIdsChangedId = this.#settings.connect(
            gsettingsChangedSignal(GSETTINGS_KEYS.profileIds),
            () => {
                const knownIds = new Set(this.#profileStores.keys());
                this.#syncProfileStores();

                for (const id of this.#profileStores.keys()) {
                    if (
                        this.#pendingCreatedIds.delete(id) ||
                        !knownIds.has(id)
                    ) {
                        this.#eventEmitter.emit({
                            type: 'profile-created',
                            payload: { profileId: id },
                        });
                    }
                }

                this.#eventEmitter.emit({
                    type: 'profile-ids-changed',
                    payload: {},
                });
            },
        );
        this.#signalConnections.push(profileIdsChangedId);

        const activeProfileChangedId = this.#settings.connect(
            gsettingsChangedSignal(GSETTINGS_KEYS.activeProfileId),
            () => {
                const newId = this.getActiveProfileId();
                this.#eventEmitter.emit({
                    type: 'profile-switched',
                    payload: {
                        profileId: newId,
                    },
                });
            },
        );
        this.#signalConnections.push(activeProfileChangedId);
    }
}
