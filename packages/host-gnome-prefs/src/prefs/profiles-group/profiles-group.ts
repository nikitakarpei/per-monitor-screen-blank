import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import { ProfileRegistry } from '@pmsb/infrastructure-gnome';
import {
    type LoggerPort,
    type PlatformEventSubscriber,
} from '@pmsb/application';
import {
    ProfilesRowManager,
    type ProfilesRowManagerDeps,
} from './profiles-row-manager.js';

interface ProfilesGroupDeps {
    settings: Gio.Settings;
    profileRegistry: ProfileRegistry;
    window: Gtk.Window;
    eventSubscriber: PlatformEventSubscriber;
    logger: LoggerPort;
}

export class ProfilesGroup extends Adw.PreferencesGroup {
    static {
        void GObject.registerClass({ GTypeName: 'ProfilesGroup' }, this);
    }

    _rowManager: ProfilesRowManager;

    constructor(deps: ProfilesGroupDeps) {
        super({
            title: 'Presets',
            description:
                'Manage monitor configuration presets. Click a preset to activate it.',
        });

        const { profileRegistry, window, eventSubscriber, logger } = deps;

        const rowManagerDeps: ProfilesRowManagerDeps = {
            group: this,
            profileRegistry,
            window,
            eventSubscriber,
            logger,
        };
        this._rowManager = new ProfilesRowManager(rowManagerDeps);

        this.refresh();
    }

    refresh(): void {
        this._rowManager.syncRows();
    }

    destroy(): void {
        this._rowManager.destroy();
    }
}
