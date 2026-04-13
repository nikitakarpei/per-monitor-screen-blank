import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

export const Indicator = GObject.registerClass(class Indicator extends PanelMenu.Button {
    constructor() {
        super(0.0, 'Per-Monitor Screen Blank');

        this._icon = new St.Icon({ style_class: 'system-status-icon' });
        this._label = new St.Label({ text: '' });
        this.add_child(this._icon);
        this.add_child(this._label);
    }

    destroy() {
        this._disconnect?.();
        super.destroy();
    }

    bindState(stateMachine, mapStateToViewModel) {
        this._disconnect?.();
        const sync = () => {
            const ui = mapStateToViewModel(stateMachine.state);
            this._icon.icon_name = ui.icon;
            this._label.text = ui.label;
            this.accessible_name = ui.accessibleName;
        };
        sync();
        this._disconnect = stateMachine.on('state-changed', sync);
    }
});
