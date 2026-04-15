import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

export const GnomeQuickSettings = GObject.registerClass(class GnomeQuickSettings extends QuickSettings.SystemIndicator {
    constructor(actions = {}) {
        super();
        this._actions = actions;

        this._indicator = this._addIndicator();
        this._indicator.icon_name = 'display-symbolic';

        this._item = new QuickSettings.QuickMenuToggle({
            title: 'Screen Blank',
            subtitle: 'No preset',
            iconName: 'display-symbolic',
            toggleMode: false,
        });
        this._item.menu.setHeader('display-symbolic', 'Per-Monitor Screen Blank');
        this._profileSection = undefined;
        this._item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._item.menu.addAction('Open Settings', () => this._actions.openSettings?.());
        this.quickSettingsItems.push(this._item);
    }

    enable() {
        Main.panel.statusArea.quickSettings?.addExternalIndicator(this);
    }

    destroy() {
        this._item?.destroy();
        this._item = undefined;
        super.destroy();
    }

    bindProfiles(getProfiles, onSelectProfile) {
        this._profileGetter = getProfiles;
        this._onSelectProfile = onSelectProfile;
        this._syncProfiles();
    }

    refreshProfiles() {
        this._syncProfiles();
    }

    _syncProfiles() {
        if (!this._item?.menu) return;
        this._profileSection?.removeAll();
        if (!this._profileSection) {
            this._profileSection = new PopupMenu.PopupMenuSection();
            this._item.menu.addMenuItem(this._profileSection, 0);
        }

        const state = this._profileGetter?.() ?? { profiles: [], activeProfileId: '' };
        this._profileSection.addMenuItem(new PopupMenu.PopupMenuItem('Presets', {
            reactive: false,
            can_focus: false,
        }));
        for (const profile of state.profiles) {
            const row = new PopupMenu.PopupMenuItem(profile.name);
            row.setOrnament(profile.id === state.activeProfileId
                ? PopupMenu.Ornament.DOT
                : PopupMenu.Ornament.NONE);
            row.connect('activate', () => this._onSelectProfile?.(profile.id));
            this._profileSection.addMenuItem(row);
        }
        this._item.subtitle = state.profiles.find(profile => profile.id === state.activeProfileId)?.name ?? 'No preset';
    }
});
