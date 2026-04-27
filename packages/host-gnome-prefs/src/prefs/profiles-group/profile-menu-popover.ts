import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

interface ProfileMenuPopoverCallbacks {
    onActivate: () => void;
    onRename: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

export class ProfileMenuPopover extends Gtk.MenuButton {
    static {
        void GObject.registerClass({ GTypeName: 'ProfileMenuPopover' }, this);
    }

    _signalIds: number[] = [];

    constructor(
        isActive: boolean,
        canDelete: boolean,
        callbacks: ProfileMenuPopoverCallbacks,
    ) {
        super({
            icon_name: 'open-menu-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Preset actions',
        });

        const popover = new Gtk.Popover();
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 8,
            margin_end: 8,
        });
        popover.set_child(box);
        this.set_popover(popover);

        // Activate / Switch to
        const activateLabel = isActive ? 'Activate' : 'Switch to';
        const activateButton = new Gtk.Button({ label: activateLabel });
        activateButton.sensitive = !isActive;
        const activateSignalId = activateButton.connect('clicked', () => {
            popover.popdown();
            callbacks.onActivate();
        });
        this._signalIds.push(activateSignalId);
        box.append(activateButton);

        // Rename
        const renameButton = new Gtk.Button({ label: 'Rename' });
        const renameSignalId = renameButton.connect('clicked', () => {
            popover.popdown();
            callbacks.onRename();
        });
        this._signalIds.push(renameSignalId);
        box.append(renameButton);

        // Duplicate
        const duplicateButton = new Gtk.Button({ label: 'Duplicate' });
        const duplicateSignalId = duplicateButton.connect('clicked', () => {
            popover.popdown();
            callbacks.onDuplicate();
        });
        this._signalIds.push(duplicateSignalId);
        box.append(duplicateButton);

        // Delete
        const deleteButton = new Gtk.Button({ label: 'Delete' });
        deleteButton.sensitive = canDelete;
        const deleteSignalId = deleteButton.connect('clicked', () => {
            if (!canDelete) return;
            popover.popdown();
            callbacks.onDelete();
        });
        this._signalIds.push(deleteSignalId);
        box.append(deleteButton);
    }

    destroy(): void {
        for (const signalId of this._signalIds) {
            try {
                this.disconnect(signalId);
            } catch {
                // Widget already finalized — signal auto-detached
            }
        }
        this._signalIds = [];
    }
}
