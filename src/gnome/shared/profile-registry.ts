import Gio from 'gi://Gio';
import type { PlatformEventBus } from '../../ports/index.js';
import type { ProfileId } from '../../domain/ports-domain.js';
import type { MonitorMode } from '../../domain/monitor-mode.js';
import {
    GSETTINGS_KEYS,
    gsettingsChangedSignal,
} from '../gsettings-schema-keys.js';
import { ProfileStore } from './profile-store.js';

interface CreateProfileOptions {
    settings: Gio.Settings;
    eventBus: PlatformEventBus;
    createProfileSettings: (profileId: ProfileId) => Gio.Settings;
}

/**
 * Manages lifecycle of per-profile GSettings instances.
 * Creates/destroys ProfileStore instances as profiles are added/removed.
 */
export class ProfileRegistry {
    readonly #mainSettings: Gio.Settings;
    readonly #eventBus: PlatformEventBus;
    readonly #gsettingsFactory: (_profileId: ProfileId) => Gio.Settings;
    readonly #profileStores = new Map<ProfileId, ProfileStore>();
    readonly #signalConnections: number[] = [];
    #destroyed = false;
    #started = false;

    constructor(options: CreateProfileOptions) {
        this.#mainSettings = options.settings;
        this.#eventBus = options.eventBus;
        this.#gsettingsFactory = (profileId: ProfileId) => {
            try {
                return options.createProfileSettings(profileId);
            } catch (error) {
                logError(
                    error,
                    `per-monitor-screen-blank: Failed to create profile settings for ${profileId}`,
                );
                throw error;
            }
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

        // Disconnect all signals
        for (const id of this.#signalConnections) {
            try {
                this.#mainSettings.disconnect(id);
            } catch {
                // Ignore disconnect errors
            }
        }
        this.#signalConnections.length = 0;

        // Destroy all profile stores
        for (const store of this.#profileStores.values()) {
            store.destroy();
        }
        this.#profileStores.clear();
    }

    createProfile(
        id: ProfileId,
        name: string,
        initialModes?: Map<string, MonitorMode>,
    ): ProfileStore {
        if (this.#profileStores.has(id)) {
            throw new Error(`Profile ${id} already exists`);
        }

        // Add to profile-ids list
        const profileIds = this.#mainSettings.get_strv(
            GSETTINGS_KEYS.profileIds,
        );
        if (!profileIds.includes(id)) {
            const newIds = [...profileIds, id];
            const saved = this.#mainSettings.set_strv(
                GSETTINGS_KEYS.profileIds,
                newIds,
            );
            if (!saved) {
                throw new Error(
                    `failed to add profile ${id} to profile-ids list`,
                );
            }
        }

        // Create the profile store
        const profileSettings = this.#gsettingsFactory(id);
        const nameSet = profileSettings.set_string('name', name || id);
        const modesSet = profileSettings.set_string('monitor-modes', '{}');
        if (!nameSet || !modesSet) {
            throw new Error(`failed to initialize profile ${id} settings`);
        }

        // Create and store the ProfileStore
        const store = new ProfileStore({
            profileId: id,
            settings: profileSettings,
            eventEmitter: this.#eventBus,
        });
        this.#profileStores.set(id, store);

        // Set initial modes if provided
        if (initialModes) {
            for (const [monitorId, mode] of initialModes.entries()) {
                store.setMonitorMode(monitorId, mode);
            }
        }

        // Emit profile-created event after profile is fully set up
        this.#eventBus.emit({
            type: 'profile-created',
            payload: { profileId: id },
        });

        return store;
    }

    deleteProfile(id: ProfileId): boolean {
        const store = this.#profileStores.get(id);
        if (!store) {
            return false;
        }
        store.destroy();
        this.#profileStores.delete(id);

        // Remove from profile-ids list
        const profileIds = this.#mainSettings.get_strv(
            GSETTINGS_KEYS.profileIds,
        );
        const index = profileIds.indexOf(id);
        if (index !== -1) {
            const newIds = profileIds.filter((_, index_) => index_ !== index);
            const saved = this.#mainSettings.set_strv(
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
                const cleared = this.#mainSettings.set_string(
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
        return true;
    }

    getProfileSettings(id: ProfileId): ProfileStore | undefined {
        return this.#profileStores.get(id);
    }

    getProfileIds(): ProfileId[] {
        return this.#mainSettings.get_strv(GSETTINGS_KEYS.profileIds);
    }

    getActiveProfileId(): ProfileId {
        return this.#mainSettings.get_string(GSETTINGS_KEYS.activeProfileId);
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

        const saved = this.#mainSettings.set_string(
            GSETTINGS_KEYS.activeProfileId,
            id,
        );
        if (!saved) {
            throw new Error(`failed to set active profile id to ${id}`);
        }
    }

    onProfileSwitched(
        callback: (payload: { profileId: ProfileId }) => void,
    ): () => void {
        return this.#eventBus.on('profile-switched', callback);
    }

    onMonitorModeChanged(
        callback: (payload: {
            profileId: ProfileId;
            monitorId: string;
            mode: MonitorMode;
        }) => void,
    ): () => void {
        return this.#eventBus.on('monitor-mode-changed', callback);
    }

    ensureDefaultProfile(): ProfileStore {
        const profileIds = this.getProfileIds();
        if (profileIds.length === 0) {
            const store = this.createProfile('default', 'Default');
            this.setActiveProfileId('default');
            return store;
        }

        const activeId = this.getActiveProfileId();
        if (!activeId) {
            // No active profile set, activate the first available
            const firstId = profileIds[0]!;
            this.setActiveProfileId(firstId);
            return this.getProfileSettings(firstId)!;
        }

        const existingStore = this.getProfileSettings(activeId);
        if (existingStore) {
            return existingStore;
        }

        // Active profile references a non-existent profile, fallback to first available
        const firstId = profileIds[0]!;
        this.setActiveProfileId(firstId);
        return this.getProfileSettings(firstId)!;
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
                const profileSettings = this.#gsettingsFactory(id);
                const store = new ProfileStore({
                    profileId: id,
                    settings: profileSettings,
                    eventEmitter: this.#eventBus,
                });
                this.#profileStores.set(id, store);
            }
        }
    }

    #wireMainSignals(): void {
        const profileIdsChangedId = this.#mainSettings.connect(
            gsettingsChangedSignal(GSETTINGS_KEYS.profileIds),
            () => {
                this.#syncProfileStores();
                this.#eventBus.emit({
                    type: 'profile-ids-changed',
                    payload: {},
                });
            },
        );
        this.#signalConnections.push(profileIdsChangedId);

        const activeProfileChangedId = this.#mainSettings.connect(
            gsettingsChangedSignal(GSETTINGS_KEYS.activeProfileId),
            () => {
                const newId = this.getActiveProfileId();
                this.#eventBus.emit({
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
