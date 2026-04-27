import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import {
    buildIssueNotificationText,
    GSETTINGS_KEYS,
} from '@pmsb/infrastructure-gnome';
import { type IssueReport } from '@pmsb/application';

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
