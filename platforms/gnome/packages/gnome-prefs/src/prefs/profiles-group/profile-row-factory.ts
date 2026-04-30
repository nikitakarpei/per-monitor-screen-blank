import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import { type Profile } from '@pmsb/domain';
import { type LoggerPort } from '@pmsb/application';
import { ProfileMenuPopover } from './profile-menu-popover.js';

interface ProfileRowCallbacks {
    onActivate: () => void;
    onRename: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

export class ProfileRow extends Adw.ActionRow {
    static {
        void GObject.registerClass({ GTypeName: 'ProfileRow' }, this);
    }

    _popover: ProfileMenuPopover;

    constructor(
        profile: Profile,
        isActive: boolean,
        canDelete: boolean,
        callbacks: ProfileRowCallbacks,
        logger: LoggerPort,
    ) {
        super({
            title: profile.name,
            subtitle: isActive ? 'Currently in use' : '',
            activatable: true,
        });

        const dragHandle = new Gtk.Image({
            icon_name: 'list-drag-handle-symbolic',
            valign: Gtk.Align.CENTER,
            margin_end: 8,
        });
        this.add_prefix(dragHandle);

        void this.connect('activated', () => {
            if (isActive) return;
            callbacks.onActivate();
        });

        this._popover = new ProfileMenuPopover(
            isActive,
            canDelete,
            callbacks,
            logger,
        );
        this.add_suffix(this._popover);
        this.activatable_widget = this._popover;
    }

    destroy(): void {
        this._popover.destroy();
    }
}
