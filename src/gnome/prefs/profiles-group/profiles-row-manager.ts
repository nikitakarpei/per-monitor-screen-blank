import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ProfileRegistry } from '../../shared/profile-registry.js';
import { LoggerPort } from '../../../util/logger.js';
import { promptForProfileName } from './profile-name-dialog.js';
import { ProfileRow } from './profile-row-factory.js';
import { Profile } from '../../../domain/types.js';
import { PlatformEventSubscriber } from '../../../app/ports/platform-events.js';

export interface ProfilesRowManagerDeps {
    group: Adw.PreferencesGroup;
    profileRegistry: ProfileRegistry;
    window: Gtk.Window;
    eventSubscriber: PlatformEventSubscriber;
    logger: LoggerPort;
}

type RowEntry = ProfileRow | Adw.ActionRow;

/**
 * Manages the lifecycle of profile action rows within a PreferencesGroup.
 * Handles row creation, removal, and signal cleanup via the holder pattern.
 */
export class ProfilesRowManager {
    readonly #group: Adw.PreferencesGroup;
    readonly #profileRegistry: ProfileRegistry;
    readonly #window: Gtk.Window;
    readonly #logger: LoggerPort;

    #rowEntries: RowEntry[] = [];
    #eventUnsubscribers: Array<() => void> = [];

    constructor(deps: ProfilesRowManagerDeps) {
        this.#group = deps.group;
        this.#profileRegistry = deps.profileRegistry;
        this.#window = deps.window;
        this.#logger = deps.logger;

        this.#eventUnsubscribers.push(
            deps.eventSubscriber.on('profile-created', () => this.syncRows()),
            deps.eventSubscriber.on('profile-ids-changed', () =>
                this.syncRows(),
            ),
            deps.eventSubscriber.on('profile-switched', () => this.syncRows()),
            deps.eventSubscriber.on('profile-name-changed', () =>
                this.syncRows(),
            ),
        );
    }

    syncRows(): void {
        this.#clearRows();

        const profiles = this.#profileRegistry.getAllProfiles();
        const activeProfileId = this.#profileRegistry.getActiveProfileId();
        const canDelete = profiles.length > 1;

        for (const profile of profiles) {
            const isActive = profile.id === activeProfileId;
            const row = new ProfileRow(profile, isActive, canDelete, {
                onActivate: () => {
                    this.#profileRegistry.setActiveProfileId(profile.id);
                },
                onRename: () => {
                    this.#handleRename(profile).catch((error) => {
                        this.#logger.error(
                            `failed to rename profile ${profile.id}: ${error}`,
                        );
                    });
                },
                onDuplicate: () => {
                    this.#handleDuplicate(profile);
                },
                onDelete: () => {
                    this.#profileRegistry.deleteProfile(profile.id);
                },
            });

            this.#group.add(row);
            this.#rowEntries.push(row);
        }

        this.#buildAddRow();
    }

    async #handleRename(profile: Profile): Promise<void> {
        const name = await promptForProfileName(
            this.#window,
            'Rename Preset',
            profile.name,
        );
        if (name) {
            const store = this.#profileRegistry.getProfileStore(profile.id);
            if (!store) {
                this.#logger.warn(
                    `cannot rename profile ${profile.id}: store not found`,
                );
                return;
            }
            store.setName(name);
        }
    }

    #handleDuplicate(profile: Profile): void {
        const sourceStore = this.#profileRegistry.getProfileStore(profile.id);
        if (!sourceStore) {
            this.#logger.warn(
                `cannot duplicate profile ${profile.id}: source not found`,
            );
            return;
        }
        const sourceName = sourceStore.getName();
        const sourceModes = sourceStore.getMonitorModes();
        const newStore = this.#profileRegistry.createProfile(
            `${sourceName} (copy)`,
            sourceModes,
        );
        if (!newStore) {
            this.#logger.warn(`failed to duplicate profile ${sourceName}`);
        }
    }

    destroy(): void {
        for (const unsubscribe of this.#eventUnsubscribers) {
            unsubscribe();
        }
        this.#eventUnsubscribers = [];
        this.#clearRows();
    }

    #clearRows(): void {
        for (const entry of this.#rowEntries) {
            this.#group.remove(entry);
            if ('destroy' in entry && typeof entry.destroy === 'function') {
                entry.destroy();
            }
        }
        this.#rowEntries = [];
    }

    #buildAddRow(): void {
        const addRow = new Adw.ActionRow({
            title: 'Add Preset',
            subtitle: 'Save another monitor setup.',
            activatable: true,
        });

        void addRow.connect('activated', async () => {
            const name = await promptForProfileName(
                this.#window,
                'Create Preset',
                '',
            );
            void this.#handleCreateProfile(name);
        });

        this.#group.add(addRow);
        this.#rowEntries.push(addRow);
    }

    #handleCreateProfile(name?: string): void {
        if (!name) return;
        const newStore = this.#profileRegistry.createProfile(name);
        if (!newStore) {
            this.#logger.warn(
                `failed to create profile ${name}: store creation failed`,
            );
        }
    }
}
