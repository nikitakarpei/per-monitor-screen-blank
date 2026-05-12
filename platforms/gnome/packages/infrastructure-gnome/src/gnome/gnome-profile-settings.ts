import type Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import type { LoggerPort, ProfileSettings } from '@pmsb/application';
import type { Profile, ProfileId, MonitorMode } from '@pmsb/domain';
import type { Disposable } from '@pmsb/lifecycle';
import { GSETTINGS_KEYS } from './gsettings-schema-keys.js';
import { ProfileSettingsStore } from './profile-settings-store.js';

export type ProfileGioSettingsFactory = (profileId: ProfileId) => Gio.Settings;

export type ProfileIdsChange = {
    createdProfileIds: readonly ProfileId[];
    removedProfileIds: readonly ProfileId[];
};

export class GnomeProfileSettings implements ProfileSettings {
    readonly #settings: Gio.Settings;
    readonly #createProfileSettings: ProfileGioSettingsFactory;
    readonly #logger: LoggerPort;

    constructor(
        settings: Gio.Settings,
        createProfileSettings: ProfileGioSettingsFactory,
        logger: LoggerPort,
    ) {
        this.#settings = settings;
        this.#createProfileSettings = createProfileSettings;
        this.#logger = logger;
    }

    ensureDefaultProfile(): void {
        const profileIds = this.getProfileIds();
        if (profileIds.length === 0) {
            const profileId = this.createProfile('Default');
            this.setActiveProfile(profileId);
        }
    }

    getProfileIds(): readonly ProfileId[] {
        return this.#readProfileIds();
    }

    getActiveProfileId(): ProfileId | null {
        const activeId = this.#settings.get_string(
            GSETTINGS_KEYS.activeProfileId,
        );
        if (activeId === '') {
            return null;
        }

        return activeId;
    }

    getProfiles(): Profile[] {
        const profileIds = this.#readProfileIds();
        return profileIds.map((profileId) => this.#readProfile(profileId));
    }

    getActiveProfile(): Profile | null {
        const activeId = this.getActiveProfileId();
        if (activeId === null) {
            return null;
        }

        return this.#readProfile(activeId);
    }

    setActiveProfile(id: ProfileId): void {
        const oldId = this.#settings.get_string(GSETTINGS_KEYS.activeProfileId);
        if (oldId === id) {
            return;
        }

        this.#throwIfProfileNotExists(id);

        const saved = this.#settings.set_string(
            GSETTINGS_KEYS.activeProfileId,
            id,
        );
        if (!saved) {
            throw new Error(`failed to set active profile id to ${id}`);
        }

        const savedLast = this.#settings.set_string(
            GSETTINGS_KEYS.lastActiveProfileId,
            id,
        );
        if (!savedLast) {
            throw new Error(`failed to set last active profile id to ${id}`);
        }
    }

    deactivateProfile(): void {
        const saved = this.#settings.set_string(
            GSETTINGS_KEYS.activeProfileId,
            '',
        );
        if (!saved) {
            throw new Error('failed to deactivate profile');
        }
    }

    restoreLastActiveProfile(): void {
        const lastId = this.#settings.get_string(
            GSETTINGS_KEYS.lastActiveProfileId,
        );
        if (lastId === '') {
            throw new Error(
                'restore-last-active-profile: no last active profile recorded',
            );
        }

        const profileIds = this.#readProfileIds();
        if (!profileIds.includes(lastId)) {
            const fallbackProfileId = profileIds.at(0);
            if (fallbackProfileId === undefined) {
                throw new Error(
                    'restore-last-active-profile: remembered profile no longer exists and no fallback profile available',
                );
            }

            this.#logger.info(
                `restore-last-active-profile: remembered profile ${lastId} is missing; activating fallback profile ${fallbackProfileId}`,
            );
            this.setActiveProfile(fallbackProfileId);
            return;
        }

        this.setActiveProfile(lastId);
    }

    createProfile(name: string): ProfileId {
        const id = this.#generateId();

        const profileIds = this.#settings.get_strv(GSETTINGS_KEYS.profileIds);
        const newIds = [...profileIds, id];
        const saved = this.#settings.set_strv(
            GSETTINGS_KEYS.profileIds,
            newIds,
        );
        if (!saved) {
            throw new Error(`failed to add profile ${id} to profile-ids list`);
        }

        const store = this.#createProfileStore(id);
        store.setName(name);

        return id;
    }

    deleteProfile(id: ProfileId): void {
        const profileIds = this.#readProfileIds();
        if (!profileIds.includes(id)) {
            throw new Error(`profile ${id} not found`);
        }

        const activeId = this.#settings.get_string(
            GSETTINGS_KEYS.activeProfileId,
        );
        if (activeId === id) {
            throw new Error(`cannot delete active profile ${id}`);
        }

        const newIds = profileIds.filter((profileId) => profileId !== id);
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

    renameProfile(id: ProfileId, name: string): void {
        const store = this.#createProfileStore(id);
        store.setName(name);
    }

    observeProfileIdsChanged(
        callback: (change: ProfileIdsChange) => void,
    ): Disposable {
        let previousProfileIds = new Set(this.#readProfileIds());
        const connectionId = this.#settings.connect(
            `changed::${GSETTINGS_KEYS.profileIds}`,
            () => {
                const profileIds = this.#readProfileIds();
                const nextProfileIds = new Set(profileIds);
                const createdProfileIds = profileIds.filter(
                    (profileId) => !previousProfileIds.has(profileId),
                );
                const removedProfileIds = [...previousProfileIds].filter(
                    (profileId) => !nextProfileIds.has(profileId),
                );

                previousProfileIds = nextProfileIds;
                callback({ createdProfileIds, removedProfileIds });
            },
        );

        return {
            dispose: (): void => this.#settings.disconnect(connectionId),
        };
    }

    observeActiveProfileIdChanged(
        callback: (profileId: ProfileId | null) => void,
    ): Disposable {
        const connectionId = this.#settings.connect(
            `changed::${GSETTINGS_KEYS.activeProfileId}`,
            () => {
                callback(this.getActiveProfileId());
            },
        );

        return {
            dispose: (): void => this.#settings.disconnect(connectionId),
        };
    }

    getMonitorMode(profileId: ProfileId, monitorId: string): MonitorMode {
        const store = this.#createProfileStore(profileId);
        return store.getMonitorMode(monitorId);
    }

    setMonitorMode(
        profileId: ProfileId,
        monitorId: string,
        mode: MonitorMode,
    ): void {
        const store = this.#createProfileStore(profileId);
        store.setMonitorMode(monitorId, mode);
    }

    observeProfileNameChanged(
        profileId: ProfileId,
        callback: (name: string) => void,
    ): Disposable {
        const store = this.#createProfileStore(profileId);
        return store.observeNameChanged(callback);
    }

    observeMonitorModeChanged(
        profileId: ProfileId,
        callback: (change: { monitorId: string; mode: MonitorMode }) => void,
    ): Disposable {
        const store = this.#createProfileStore(profileId);
        return store.observeMonitorModeChanged(callback);
    }

    #generateId(): string {
        return GLib.uuid_string_random();
    }

    #createProfileStore(profileId: ProfileId): ProfileSettingsStore {
        this.#throwIfProfileNotExists(profileId);
        const settings = this.#createProfileSettings(profileId);
        return new ProfileSettingsStore(profileId, settings);
    }

    #readProfile(profileId: ProfileId): Profile {
        const store = this.#createProfileStore(profileId);
        return {
            id: store.id,
            name: store.getName(),
            monitorModes: store.getMonitorModes(),
        };
    }

    #readProfileIds(): readonly ProfileId[] {
        return this.#settings.get_strv(GSETTINGS_KEYS.profileIds);
    }

    #throwIfProfileNotExists(profileId: ProfileId): void {
        const profileIds = this.#readProfileIds();
        if (!profileIds.includes(profileId)) {
            throw new Error(`profile ${profileId} not found`);
        }
    }
}
