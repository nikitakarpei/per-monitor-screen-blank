import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {
    QuickSettings as QuickSettingsPort,
    SettingsGateway,
} from '../../app/ports/settings.js';
import { Profile, ProfileId } from '../../domain/types.js';
import { PreferencesOpener } from '../shell-infra/gnome-preferences-opener.js';
import { LoggerPort } from '../../util/logger.js';

export class GnomeQuickSettings implements QuickSettingsPort {
    private readonly _preferencesOpener: PreferencesOpener;
    private readonly _settingsGateway: SettingsGateway;
    private readonly _logger: LoggerPort;
    private _indicator: QuickSettings.SystemIndicator | undefined;
    private _toggle: QuickSettings.QuickMenuToggle | undefined;
    private _profileSection: PopupMenu.PopupMenuSection | undefined;

    constructor({
        preferencesOpener,
        settingsGateway,
        logger,
    }: {
        preferencesOpener: PreferencesOpener;
        settingsGateway: SettingsGateway;
        logger: LoggerPort;
    }) {
        this._preferencesOpener = preferencesOpener;
        this._settingsGateway = settingsGateway;
        this._logger = logger;
    }

    enable(): void {
        if (this._indicator) {
            this._logger.warn(
                'GnomeQuickSettings.enable called while already enabled',
            );
            return;
        }

        this._indicator = new QuickSettings.SystemIndicator();
        this._toggle = new QuickSettings.QuickMenuToggle({
            iconName: 'display-symbolic',
            title: 'Screen Blank',
        });
        this._indicator.quickSettingsItems?.push(this._toggle);

        this._toggle.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        void this._toggle.menu.addAction('Open Settings', () => {
            Main.panel.closeQuickSettings();
            this._preferencesOpener.openSafely();
        });
        // Runtime: SystemIndicator works, but GNOME types expect Button
        Main.panel.statusArea.quickSettings?.addExternalIndicator?.(
            this._indicator as object as PanelMenu.Button,
        );
    }

    get visible(): boolean {
        return Boolean(this._toggle?.visible);
    }

    set visible(value: boolean) {
        if (this._indicator) this._indicator.visible = value;
        if (this._toggle) this._toggle.visible = value;
    }

    destroy(): void {
        this._toggle?.destroy();
        this._indicator?.destroy();
        this._indicator = undefined;
        this._toggle = undefined;
        this._profileSection = undefined;
    }

    initProfiles(
        profiles: ReadonlyArray<Readonly<Profile>>,
        activeProfileId: ProfileId,
    ): void {
        this._syncProfiles(profiles, activeProfileId);
    }

    syncProfiles(
        profiles: ReadonlyArray<Readonly<Profile>>,
        activeProfileId: ProfileId,
    ): void {
        this._syncProfiles(profiles, activeProfileId);
    }

    private _syncProfiles(
        profiles: ReadonlyArray<Readonly<Profile>>,
        activeProfileId: ProfileId,
    ): void {
        if (!this._toggle?.menu) {
            this._logger.warn(
                'GnomeQuickSettings._syncProfiles called before toggle is initialized',
            );
            return;
        }

        this._profileSection?.removeAll();

        if (!this._profileSection) {
            this._profileSection = new PopupMenu.PopupMenuSection();
            this._toggle.menu.addMenuItem(this._profileSection, 0);
        }

        this._profileSection.addMenuItem(
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
                () => this._settingsGateway.setActiveProfile(profile.id),
                this,
            );
            this._profileSection.addMenuItem(row);
        }
    }
}
