import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { buildIssueNotificationText } from '../../util/issue-notification-text.js';
import { IssueReport } from '../../util/logger.js';
import { GSETTINGS_KEYS } from '../gsettings-schema-keys.js';

type WindowWidget = {
    add_toast(toast: Adw.Toast): void;
};

export class IssueReporter {
    readonly #window: WindowWidget;
    readonly #settings: Gio.Settings;
    #lastSignature: string | undefined = undefined;

    constructor(window: WindowWidget, settings: Gio.Settings) {
        this.#window = window;
        this.#settings = settings;
    }

    destroy(): void {
        this.#lastSignature = undefined;
    }

    report(issue: IssueReport): void {
        if (
            !this.#settings.get_boolean(GSETTINGS_KEYS.showIssueNotifications)
        ) {
            return;
        }

        const signature = `${issue.level}|${issue.message}`;
        if (signature === this.#lastSignature) {
            return;
        }
        this.#lastSignature = signature;

        const notification = buildIssueNotificationText(issue);
        const toast = new Adw.Toast({
            title: notification.toastTitle,
            timeout: issue.level === 'error' ? 6 : 4,
        });
        this.#window.add_toast(toast);
    }
}
