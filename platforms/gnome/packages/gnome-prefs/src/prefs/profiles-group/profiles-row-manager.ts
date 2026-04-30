import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {
    type ProfileSettings,
    type LoggerPort,
    type PlatformEventSubscriber,
} from '@pmsb/application';
import { promptForProfileName } from './profile-name-dialog.js';
import { ProfileRow } from './profile-row-factory.js';
import { type Profile } from '@pmsb/domain';

type RowEntry = ProfileRow | Adw.ActionRow;

/**
 * Manages the lifecycle of profile action rows within a PreferencesGroup.
 * Handles row creation, removal, and signal cleanup via the holder pattern.
 */
export class ProfilesRowManager {
    readonly #group: Adw.PreferencesGroup;
    readonly #profileSettings: ProfileSettings;
    readonly #window: Gtk.Window;
    readonly #logger: LoggerPort;

    #rowEntries: RowEntry[] = [];
    #eventUnsubscribers: Array<() => void> = [];

    constructor(
        group: Adw.PreferencesGroup,
        profileSettings: ProfileSettings,
        window: Gtk.Window,
        logger: LoggerPort,
        eventSubscriber: PlatformEventSubscriber,
    ) {
        this.#group = group;
        this.#profileSettings = profileSettings;
        this.#window = window;
        this.#logger = logger;

        this.#eventUnsubscribers.push(
            eventSubscriber.on('profile-created', () => this.syncRows()),
            eventSubscriber.on('profile-ids-changed', () => this.syncRows()),
            eventSubscriber.on('profile-switched', () => this.syncRows()),
            eventSubscriber.on('profile-name-changed', () => this.syncRows()),
        );
    }

    syncRows(): void {
        this.#clearRows();

        const profiles = this.#profileSettings.getProfiles();
        const activeProfile = this.#profileSettings.getActiveProfile();
        const moreThanOneProfileAvailable = profiles.length > 1;

        for (const profile of profiles) {
            const isActive = activeProfile?.id === profile.id;
            const row = new ProfileRow(
                profile,
                isActive,
                moreThanOneProfileAvailable && !isActive,
                {
                    onActivate: () => {
                        this.#profileSettings.setActiveProfile(profile.id);
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
                        this.#profileSettings.deleteProfile(profile.id);
                    },
                },
                this.#logger,
            );

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
            this.#profileSettings.renameProfile(profile.id, name);
        }
    }

    #handleDuplicate(profile: Profile): void {
        const newId = this.#profileSettings.duplicateProfile(profile.id);
        if (!newId) {
            this.#logger.warn(`failed to duplicate profile ${profile.name}`);
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
        void this.#profileSettings.createProfile(name);
    }
}
