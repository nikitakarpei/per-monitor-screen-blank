import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { AppController } from './src/app/AppController.js';
import { ShellOverlayManager } from './src/platform/ShellOverlayManager.js';
import { PerMonitorScreenBlankQuickSettings } from './src/ui/quickSettings.js';
import { PointerContextMenu } from './src/ui/pointerContextMenu.js';
import { GSettingsGateway } from './src/platform/GSettingsGateway.js';
import { ShellRuntimeProbe } from './src/platform/ShellRuntimeProbe.js';
import { ShellSignalRegistrar } from './src/platform/ShellSignalRegistrar.js';

export default class PerMonitorScreenBlankExtension extends Extension {
    enable() {
        const settingsGateway = new GSettingsGateway(this.getSettings());
        const signalRegistrar = new ShellSignalRegistrar();
        const runtimeProbe = new ShellRuntimeProbe();
        const overlay = new ShellOverlayManager();
        const pointerContextMenu = new PointerContextMenu({
            auto: () => this._controller?.setMode('auto'),
            disabled: () => this._controller?.setDisabled(),
            keepAwake: () => this._controller?.setKeepAwake(),
            blackNow: () => this._controller?.setBlackNow(),
        });
        const quickSettings = new PerMonitorScreenBlankQuickSettings({
            openSettings: () => this._openSettingsSafely(),
        });

        this._controller = new AppController({
            settingsGateway,
            runtimeProbe,
            signalRegistrar,
            overlay,
            pointerContextMenu,
            quickSettings,
        });
        this._controller.enable();
    }

    disable() {
        this._controller?.disable();
        this._controller = null;
    }

    async _openSettingsSafely() {
        try {
            await this.openPreferences();
        } catch (error) {
            logError(error, 'Per-Monitor Screen Blank: failed to open preferences');
        }
    }
}
