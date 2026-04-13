import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { AppController } from './src/app/AppController.js';
import { ShellOverlayManager } from './src/platform/ShellOverlayManager.js';
import { PerMonitorScreenBlankQuickSettings } from './src/ui/quickSettings.js';
import { PointerContextMenu } from './src/ui/pointerContextMenu.js';
import { GSettingsGateway } from './src/platform/GSettingsGateway.js';
import { ShellPointerActivitySource } from './src/platform/ShellPointerActivitySource.js';
import { MonitorDeadlineScheduler } from './src/platform/MonitorDeadlineScheduler.js';
import { ShellSignalRegistrar } from './src/platform/ShellSignalRegistrar.js';
import { buildIssueNotificationText } from './src/util/issueNotificationText.js';
import { logInfo, logWarn, logErrorWithContext, setIssueReporter } from './src/util/logger.js';

export default class PerMonitorScreenBlankExtension extends Extension {
    _lastIssueSignature = '';

    enable() {
        logInfo('extension enabled');
        const settings = this.getSettings();
        const settingsGateway = new GSettingsGateway(settings);
        settingsGateway.ensureStorage();
        setIssueReporter(issue => this._reportIssue(settings, issue));
        const signalRegistrar = new ShellSignalRegistrar();
        const pointerActivitySource = new ShellPointerActivitySource();
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
        const deadlineScheduler = new MonitorDeadlineScheduler({
            onDeadline: deadline => this._controller.handleScheduledDeadline(deadline),
        });

        this._controller = new AppController({
            settingsGateway,
            pointerActivitySource,
            deadlineScheduler,
            signalRegistrar,
            overlay,
            pointerContextMenu,
            quickSettings,
        });
        this._controller.enable();
    }

    disable() {
        setIssueReporter(null);
        this._lastIssueSignature = '';
        this._controller?.disable();
        this._controller = null;
    }

    async _openSettingsSafely() {
        try {
            if (typeof Main.panel?.closeQuickSettings === 'function')
                Main.panel.closeQuickSettings();
            else
                logWarn('Main.panel.closeQuickSettings missing; prefs opened from Quick Settings may not receive focus until clicked');

            await new Promise(resolve => {
                GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    resolve();
                    return GLib.SOURCE_REMOVE;
                });
            });

            await this.openPreferences();
        } catch (error) {
            logErrorWithContext(error, 'failed to open preferences');
        }
    }

    _reportIssue(settings, issue) {
        if (!settings.get_boolean('show-issue-notifications'))
            return;

        const signature = [
            issue.level,
            issue.message,
            issue.detailText,
            issue.level === 'error' ? issue.errorText : '',
        ].join('|');
        if (signature === this._lastIssueSignature)
            return;
        this._lastIssueSignature = signature;

        const notification = buildIssueNotificationText(issue);

        if (issue.level === 'error')
            Main.notifyError(notification.title, notification.body);
        else
            Main.notify(notification.title, notification.body);
    }
}
