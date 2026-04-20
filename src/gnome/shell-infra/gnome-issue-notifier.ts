import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { GSETTINGS_KEYS } from '../gsettings-schema-keys.js';
import { buildIssueNotificationText } from '../../util/issue-notification-text.js';
import type { IssueReport } from '../../util/logger.js';

const MS_PER_SECOND = 1000;
const ISSUE_NOTIFY_MIN_INTERVAL_SECONDS = 1;

interface GnomeIssueNotifierOptions {
    readonly settings: Gio.Settings;
}

/**
 * Handles issue notification dispatch with deduplication.
 * Follows GNOME review rules: notifications dispatched only when enabled.
 */
export class GnomeIssueNotifier {
    private readonly _settings: Gio.Settings;
    private _lastNotifiedAt: number | undefined;

    constructor({ settings }: GnomeIssueNotifierOptions) {
        this._settings = settings;
        this._lastNotifiedAt = undefined;
    }

    reportIssue(issue: IssueReport): void {
        if (
            !this._settings.get_boolean(GSETTINGS_KEYS.showIssueNotifications)
        ) {
            return;
        }

        const now = Date.now();
        const minIntervalMs = ISSUE_NOTIFY_MIN_INTERVAL_SECONDS * MS_PER_SECOND;
        if (
            this._lastNotifiedAt &&
            now - this._lastNotifiedAt < minIntervalMs
        ) {
            // We should not annoy the user with too many notifications too quickly.
            return;
        }
        this._lastNotifiedAt = now;

        const notification = buildIssueNotificationText(issue);

        if (issue.level === 'error') {
            Main.notifyError(notification.title, notification.body);
        } else {
            Main.notify(notification.title, notification.body);
        }
    }

    destroy(): void {
        this._lastNotifiedAt = undefined;
    }
}
