import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import type { Disposable } from '@pmsb/lifecycle';
import type {
    LoggerPort,
    PlatformEventSubscriber,
    ProfileSettings,
    MonitorIdentityStore,
} from '@pmsb/application';
import { MonitorModesRowManager } from './monitor-modes-row-manager.js';

export class MonitorModesGroup
    extends Adw.PreferencesGroup
    implements Disposable
{
    static {
        void GObject.registerClass({ GTypeName: 'MonitorModesGroup' }, this);
    }

    readonly #profileSettings: ProfileSettings;
    readonly #identityStore: MonitorIdentityStore;
    readonly #rowManager: MonitorModesRowManager;

    #placeholderEntry: Adw.ActionRow | undefined = undefined;
    #eventUnsubscribers: Array<() => void> = [];

    constructor(
        profileSettings: ProfileSettings,
        identityStore: MonitorIdentityStore,
        logger: LoggerPort,
        eventSubscriber: PlatformEventSubscriber,
    ) {
        super({ title: 'Monitor Modes' });

        this.#profileSettings = profileSettings;
        this.#identityStore = identityStore;

        this.#rowManager = new MonitorModesRowManager({
            group: this,
            onModeSelected: (monitorId, mode) => {
                const activeProfile = profileSettings.getActiveProfile();
                if (!activeProfile) {
                    logger.warn(
                        'monitor mode change skipped: no active profile',
                    );
                    return;
                }
                profileSettings.setMonitorMode(
                    activeProfile.id,
                    monitorId,
                    mode,
                );
            },
            logger,
        });

        this.#eventUnsubscribers.push(
            eventSubscriber.on('known-monitors-changed', () => {
                this.refresh();
            }),
            eventSubscriber.on('monitor-mode-changed', () => {
                this.refresh();
            }),
            eventSubscriber.on('profile-switched', () => {
                this.refresh();
            }),
            eventSubscriber.on('profile-inactivated', () => {
                this.refresh();
            }),
        );

        this.refresh();
    }

    refresh(): void {
        this.#clearPlaceholder();

        const activeProfile = this.#profileSettings.getActiveProfile();
        if (!activeProfile) {
            this.#rowManager.clearRows();
            this.#setPlaceholder(
                'No profile available',
                'Create a profile to configure monitor modes.',
            );
            return;
        }

        const monitors = this.#identityStore.list();
        if (monitors.length === 0) {
            this.#rowManager.clearRows();
            this.#setPlaceholder(
                'No screens found',
                'Connect a screen and reopen Settings.',
            );
            return;
        }

        this.#rowManager.syncRows(monitors, activeProfile.monitorModes);
    }

    dispose(): void {
        for (const unsubscriber of this.#eventUnsubscribers) {
            unsubscriber();
        }

        this.#rowManager.clearRows();
        this.#clearPlaceholder();
    }

    #setPlaceholder(title: string, subtitle: string): void {
        this.#clearPlaceholder();
        const row = new Adw.ActionRow({ title, subtitle });
        this.add(row);
        this.#placeholderEntry = row;
    }

    #clearPlaceholder(): void {
        if (this.#placeholderEntry) {
            this.remove(this.#placeholderEntry);
            this.#placeholderEntry = undefined;
        }
    }
}
