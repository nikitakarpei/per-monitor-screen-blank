import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { GnomeMonitorIdentityStore } from '../../shared/monitor-identity-store.js';
import { ProfileRegistry } from '../../shared/profile-registry.js';
import { LoggerPort } from '../../../util/logger.js';
import {
    GSETTINGS_KEYS,
    gsettingsChangedSignal,
} from '../../gsettings-schema-keys.js';
import { PlatformEventSubscriber } from '../../../app/ports/platform-events.js';
import { MonitorModesRowManager } from './monitor-modes-row-manager.js';

interface MonitorModesGroupDeps {
    settings: Gio.Settings;
    profileRegistry: ProfileRegistry;
    logger: LoggerPort;
    identityStore: GnomeMonitorIdentityStore;
    eventSubscriber: PlatformEventSubscriber;
}

export class MonitorModesGroup extends Adw.PreferencesGroup {
    static {
        void GObject.registerClass(this);
    }

    _settings: Gio.Settings;
    _profileRegistry: ProfileRegistry;
    _logger: LoggerPort;
    _identityStore: GnomeMonitorIdentityStore;
    _rowManager: MonitorModesRowManager;

    _placeholderEntry: Adw.ActionRow | undefined = undefined;
    _signalIds: number[] = [];
    _eventUnsubscribers: Array<() => void> = [];

    constructor(deps: MonitorModesGroupDeps) {
        super({ title: 'Monitor Modes' });

        this._settings = deps.settings;
        this._profileRegistry = deps.profileRegistry;
        this._logger = deps.logger;
        this._identityStore = deps.identityStore;

        this._rowManager = new MonitorModesRowManager({
            group: this,
            onModeSelected: (monitorId, mode) => {
                const activeId = this._profileRegistry.getActiveProfileId();
                const store = this._profileRegistry.getProfileStore(activeId);
                if (!store) {
                    this._logger.warn(
                        `monitor mode change skipped: active profile ${activeId} not found`,
                    );
                    return;
                }
                store.setMonitorMode(monitorId, mode);
            },
            logger: this._logger,
        });

        this._signalIds.push(
            this._settings.connect(
                gsettingsChangedSignal(GSETTINGS_KEYS.knownMonitors),
                () => {
                    this.refresh();
                },
            ),
        );

        this._eventUnsubscribers.push(
            deps.eventSubscriber.on('monitor-mode-changed', () => {
                this.refresh();
            }),
            deps.eventSubscriber.on('profile-switched', () => {
                this.refresh();
            }),
        );

        this.refresh();
    }

    refresh(): void {
        this._clearPlaceholder();

        const activeProfile = this._profileRegistry.getActiveProfile();
        if (!activeProfile) {
            this._rowManager.clearRows();
            this._setPlaceholder(
                'No profile available',
                'Create a profile to configure monitor modes.',
            );
            return;
        }

        const monitors = this._identityStore.load();
        if (monitors.length === 0) {
            this._rowManager.clearRows();
            this._setPlaceholder(
                'No screens found',
                'Connect a screen and reopen Settings.',
            );
            return;
        }

        this._rowManager.syncRows(monitors, activeProfile.monitorModes);
    }

    destroy(): void {
        for (const signalId of this._signalIds) {
            this._settings.disconnect(signalId);
        }

        for (const unsubscriber of this._eventUnsubscribers) {
            unsubscriber();
        }

        this._rowManager.clearRows();
        this._clearPlaceholder();
    }

    _setPlaceholder(title: string, subtitle: string): void {
        this._clearPlaceholder();
        const row = new Adw.ActionRow({ title, subtitle });
        this.add(row);
        this._placeholderEntry = row;
    }

    _clearPlaceholder(): void {
        if (this._placeholderEntry) {
            this.remove(this._placeholderEntry);
            this._placeholderEntry = undefined;
        }
    }
}
