import Adw from 'gi://Adw';
import type Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import type { Disposable } from '@pmsb/lifecycle';
import type {
    ProfileSettings,
    LoggerPort,
    PlatformEventSubscriber,
} from '@pmsb/application';
import { ProfilesRowManager } from './profiles-row-manager.js';

export class ProfilesGroup extends Adw.PreferencesGroup implements Disposable {
    static {
        void GObject.registerClass({ GTypeName: 'ProfilesGroup' }, this);
    }

    readonly #rowManager: ProfilesRowManager;

    constructor(
        profileSettings: ProfileSettings,
        window: Gtk.Window,
        eventSubscriber: PlatformEventSubscriber,
        logger: LoggerPort,
    ) {
        super({
            title: 'Presets',
            description:
                'Manage monitor configuration presets. Click a preset to activate it.',
        });

        this.#rowManager = new ProfilesRowManager(
            this,
            profileSettings,
            window,
            logger,
            eventSubscriber,
        );

        this.refresh();
    }

    refresh(): void {
        this.#rowManager.syncRows();
    }

    dispose(): void {
        this.#rowManager.destroy();
    }
}
