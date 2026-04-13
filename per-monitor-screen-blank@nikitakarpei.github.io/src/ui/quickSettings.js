import GObject from 'gi://GObject';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { logWarn } from '../util/logger.js';

export const PerMonitorScreenBlankQuickSettings = GObject.registerClass(class PerMonitorScreenBlankQuickSettings extends QuickSettings.SystemIndicator {
    constructor(actions = {}) {
        super();
        this._actions = actions;

        this._indicator = this._addIndicator();
        this._indicator.icon_name = 'display-symbolic';

        this._item = new QuickSettings.QuickMenuToggle({
            title: 'Screen Blank',
            subtitle: 'No profile',
            iconName: 'display-symbolic',
            toggleMode: false,
        });
        this._item.menu.setHeader('display-symbolic', 'Per-Monitor Screen Blank');
        this._profileSection = null;
        this._item.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._item.menu.addAction('Open Settings', () => this._actions.openSettings?.());
        this.quickSettingsItems.push(this._item);
    }

    destroy() {
        this._disconnect?.();
        this._item?.destroy();
        this._item = null;
        super.destroy();
    }

    bindState(stateSource, mapStateToViewModel) {
        this._disconnect?.();
        const sync = () => {
            try {
                if (!this._item) return;
                const view = mapStateToViewModel?.(stateSource.state) ?? { icon: 'display-symbolic' };
                if (this._indicator) this._indicator.icon_name = view.icon;
                this._item.iconName = view.icon;
            } catch (error) {
                logWarn('quick settings state sync skipped during teardown', {
                    message: error?.message ?? String(error),
                });
            }
        };
        sync();
        this._disconnect = stateSource.on('state-changed', sync);
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
        this._profileSection.addMenuItem(new PopupMenu.PopupMenuItem('Profiles', {
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
        this._item.subtitle = state.profiles.find(profile => profile.id === state.activeProfileId)?.name ?? 'No profile';
    }
});
