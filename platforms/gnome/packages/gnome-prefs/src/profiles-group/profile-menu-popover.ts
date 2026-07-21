import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import type { LoggerPort } from '@pmsb/application';

interface ProfileMenuPopoverCallbacks {
    onActivate: () => void;
    onRename: () => void;
    onDelete: () => void;
}

export class ProfileMenuPopover extends Gtk.MenuButton {
    static {
        void GObject.registerClass({ GTypeName: 'ProfileMenuPopover' }, this);
    }

    _signalConnections: Array<{ widget: Gtk.Button; signalId: number }> = [];
    readonly #logger: LoggerPort;

    constructor(
        isActive: boolean,
        canDelete: boolean,
        callbacks: ProfileMenuPopoverCallbacks,
        logger: LoggerPort,
    ) {
        super({
            icon_name: 'open-menu-symbolic',
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Preset actions',
        });

        this.#logger = logger;

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
        this._signalConnections.push({
            widget: activateButton,
            signalId: activateSignalId,
        });
        box.append(activateButton);

        // Rename
        const renameButton = new Gtk.Button({ label: 'Rename' });
        const renameSignalId = renameButton.connect('clicked', () => {
            popover.popdown();
            callbacks.onRename();
        });
        this._signalConnections.push({
            widget: renameButton,
            signalId: renameSignalId,
        });
        box.append(renameButton);

        // Delete
        const deleteButton = new Gtk.Button({ label: 'Delete' });
        deleteButton.sensitive = canDelete;
        const deleteSignalId = deleteButton.connect('clicked', () => {
            if (!canDelete) return;
            popover.popdown();
            callbacks.onDelete();
        });
        this._signalConnections.push({
            widget: deleteButton,
            signalId: deleteSignalId,
        });
        box.append(deleteButton);
    }

    destroy(): void {
        for (const { widget, signalId } of this._signalConnections) {
            try {
                widget.disconnect(signalId);
            } catch (error) {
                this.#logger.warn(
                    `failed to disconnect profile menu signal: ${signalId}, ${error}`,
                );
            }
        }
        this._signalConnections = [];
    }
}
