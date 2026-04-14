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
    _openPreferencesIdleSourceId = null;
    _openPreferencesInFlight = false;

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
        this._removeOpenPreferencesIdleSource();
        this._openPreferencesInFlight = false;
        this._controller?.disable();
        this._controller = null;
    }

    async _openSettingsSafely() {
        try {
            if (this._openPreferencesInFlight) {
                logWarn('preferences open request skipped: existing request still pending');
                return;
            }
            this._openPreferencesInFlight = true;
            if (typeof Main.panel?.closeQuickSettings === 'function')
                Main.panel.closeQuickSettings();
            else
                logWarn('Main.panel.closeQuickSettings missing; prefs opened from Quick Settings may not receive focus until clicked');

            await this._waitForNextIdle();

            if (!this._controller) {
                logWarn('preferences open request skipped: extension disabled before idle callback completed');
                return;
            }

            await this.openPreferences();
        } catch (error) {
            logErrorWithContext(error, 'failed to open preferences');
        } finally {
            this._openPreferencesInFlight = false;
        }
    }

    _waitForNextIdle() {
        return new Promise(resolve => {
            const sourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                if (this._openPreferencesIdleSourceId === sourceId)
                    this._openPreferencesIdleSourceId = null;
                resolve();
                return GLib.SOURCE_REMOVE;
            });
            if (!sourceId) {
                logWarn('idle wait skipped: failed to allocate GLib idle source for preferences open');
                resolve();
                return;
            }
            this._openPreferencesIdleSourceId = sourceId;
        });
    }

    _removeOpenPreferencesIdleSource() {
        if (!this._openPreferencesIdleSourceId)
            return;

        try {
            GLib.Source.remove(this._openPreferencesIdleSourceId);
        } catch (error) {
            logWarn('failed to remove pending preferences idle source during disable', {
                sourceId: this._openPreferencesIdleSourceId,
                error: String(error),
            });
        } finally {
            this._openPreferencesIdleSourceId = null;
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
