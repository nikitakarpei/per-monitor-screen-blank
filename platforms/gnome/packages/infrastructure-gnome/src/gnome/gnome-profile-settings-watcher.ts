import { type LoggerPort, type PlatformEventEmitter } from '@pmsb/application';
import { type ProfileId } from '@pmsb/domain';
import {
    type Disposable,
    type DisposableStore,
    createDisposableStore,
} from '@pmsb/lifecycle';
import {
    GnomeProfileSettings,
    ProfileIdsChange,
} from './gnome-profile-settings.js';

export class GnomeProfileSettingsWatcher implements Disposable {
    readonly #profileSettings: GnomeProfileSettings;
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #logger: LoggerPort;
    readonly #observationStore: DisposableStore;
    readonly #observersByProfileId = new Map<ProfileId, Disposable>();
    #destroyed = false;

    constructor(
        profileSettings: GnomeProfileSettings,
        eventEmitter: PlatformEventEmitter,
        logger: LoggerPort,
    ) {
        this.#profileSettings = profileSettings;
        this.#eventEmitter = eventEmitter;
        this.#logger = logger;
        this.#observationStore = createDisposableStore((error) => {
            this.#logger.error(
                `Failed to dispose resource in GnomeProfileSettingsWatcher observation store`,
                error,
            );
        });

        this.#observationStore.add(
            this.#profileSettings.observeProfileIdsChanged(
                this.#handleProfileIdsChanged.bind(this),
            ),
        );
        this.#observationStore.add(
            this.#profileSettings.observeActiveProfileIdChanged(
                this.#handleActiveProfileIdChanged.bind(this),
            ),
        );

        for (const profileId of this.#profileSettings.getProfileIds()) {
            this.#ensureProfileObserver(profileId);
        }
    }

    dispose(): void {
        if (this.#destroyed) {
            return;
        }

        this.#destroyed = true;

        for (const observer of this.#observersByProfileId.values()) {
            observer.dispose();
        }
        this.#observersByProfileId.clear();
        this.#observationStore.dispose();
    }

    #ensureProfileObserver(profileId: ProfileId): void {
        if (this.#observersByProfileId.has(profileId)) {
            return;
        }

        const observer = this.#createProfileObserver(profileId);
        this.#observersByProfileId.set(profileId, observer);
    }

    #destroyProfileObserver(profileId: ProfileId): void {
        const observer = this.#observersByProfileId.get(profileId);
        if (!observer) {
            return;
        }

        observer.dispose();
        this.#observersByProfileId.delete(profileId);
    }

    #createProfileObserver(profileId: ProfileId): Disposable {
        const scope = createDisposableStore((error) => {
            this.#logger.error(
                `Failed to dispose resource in profile observer for ${profileId}`,
                error,
            );
        });

        scope.add(
            this.#profileSettings.observeProfileNameChanged(
                profileId,
                (name) => {
                    this.#eventEmitter.emit({
                        type: 'profile-name-changed',
                        payload: { profileId, name },
                    });
                },
            ),
        );

        scope.add(
            this.#profileSettings.observeMonitorModeChanged(
                profileId,
                ({ monitorId, mode }) => {
                    this.#eventEmitter.emit({
                        type: 'monitor-mode-changed',
                        payload: {
                            profileId,
                            monitorId,
                            mode,
                        },
                    });
                },
            ),
        );

        return scope;
    }

    #handleProfileIdsChanged(change: ProfileIdsChange): void {
        for (const profileId of change.removedProfileIds) {
            this.#destroyProfileObserver(profileId);
        }

        for (const profileId of change.createdProfileIds) {
            this.#ensureProfileObserver(profileId);
            this.#eventEmitter.emit({
                type: 'profile-created',
                payload: { profileId },
            });
        }

        this.#eventEmitter.emit({
            type: 'profile-ids-changed',
            payload: {},
        });
    }

    #handleActiveProfileIdChanged(profileId: ProfileId | null): void {
        if (profileId === null) {
            return;
        }

        this.#eventEmitter.emit({
            type: 'profile-switched',
            payload: { profileId },
        });
    }
}
