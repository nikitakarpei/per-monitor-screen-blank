import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import type * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import type {
    QuickSettings as QuickSettingsPort,
    ProfileSettings,
    LoggerPort,
} from '@pmsb/application';
import type { Profile, ProfileId } from '@pmsb/domain';
import type { Disposable } from '@pmsb/lifecycle';
import type { PreferencesOpener } from '../shell-infra/gnome-preferences-opener.js';

export class GnomeQuickSettings implements QuickSettingsPort, Disposable {
    readonly #preferencesOpener: PreferencesOpener;
    readonly #profileSettings: ProfileSettings;
    readonly #logger: LoggerPort;
    readonly #indicator: QuickSettings.SystemIndicator;
    readonly #toggle: QuickSettings.QuickMenuToggle;
    readonly #profileSection: PopupMenu.PopupMenuSection;

    constructor(
        logger: LoggerPort,
        preferencesOpener: PreferencesOpener,
        profileSettings: ProfileSettings,
    ) {
        this.#logger = logger;
        this.#preferencesOpener = preferencesOpener;
        this.#profileSettings = profileSettings;

        this.#indicator = new QuickSettings.SystemIndicator();
        this.#toggle = new QuickSettings.QuickMenuToggle({
            iconName: 'display-symbolic',
            title: 'Screen Blank',
        });
        this.#indicator.quickSettingsItems.push(this.#toggle);

        this.#toggle.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        void this.#toggle.menu.addAction('Open Settings', () => {
            Main.panel.closeQuickSettings();
            this.#preferencesOpener.openSafely();
        });
        Main.panel.statusArea.quickSettings.addExternalIndicator(
            this.#indicator as object as PanelMenu.Button,
        );

        this.#profileSection = new PopupMenu.PopupMenuSection();
        this.#toggle.menu.addMenuItem(this.#profileSection, 0);
    }

    get visible(): boolean {
        return this.#toggle.visible;
    }

    set visible(value: boolean) {
        this.#indicator.visible = value;
        this.#toggle.visible = value;
    }

    dispose(): void {
        this.#profileSection.destroy();
        this.#toggle.destroy();
        this.#indicator.destroy();
    }

    syncProfiles(): void {
        const profiles = this.#profileSettings.getProfiles();
        const activeProfile = this.#profileSettings.getActiveProfile();
        if (!activeProfile) {
            this.#logger.warn(
                'GnomeQuickSettings.syncProfiles: no active profile found; UI will show no selection',
            );
        }
        this.#syncProfiles(profiles, activeProfile?.id);
    }

    #syncProfiles(
        profiles: ReadonlyArray<Readonly<Profile>>,
        activeProfileId: ProfileId | undefined,
    ): void {
        this.#profileSection.removeAll();
        this.#profileSection.addMenuItem(
            new PopupMenu.PopupMenuItem('Presets', {
                reactive: false,
                can_focus: false,
            }),
        );

        for (const profile of profiles) {
            const row = new PopupMenu.PopupMenuItem(profile.name);
            row.setOrnament(
                profile.id === activeProfileId
                    ? PopupMenu.Ornament.DOT
                    : PopupMenu.Ornament.NONE,
            );
            row.connectObject(
                'activate',
                () => this.#profileSettings.setActiveProfile(profile.id),
                this,
            );
            this.#profileSection.addMenuItem(row);
        }
    }
}
