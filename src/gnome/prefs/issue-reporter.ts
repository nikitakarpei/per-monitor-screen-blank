import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import { buildIssueNotificationText } from '../../util/issue-notification-text.js';
import type { IssueReport } from '../../util/logger.js';

interface WindowWidget {
    add_toast(toast: Adw.Toast): void;
}

/**
 * Reports issues as Adw.Toast notifications in the preferences window.
 * Handles deduplication and settings checks.
 */
export class IssueReporter {
    #lastSignature: string | undefined = undefined;

    /**
     * Cleanup method for when the window is destroyed.
     * Alias for reset().
     */
    destroy(): void {
        this.reset();
    }

    /**
     * Reset the deduplication state. Call this when the window is destroyed.
     */
    reset(): void {
        this.#lastSignature = undefined;
    }

    /**
     * Report an issue as a toast notification if settings allow.
     * Deduplicates identical consecutive issues.
     *
     * @param window - The preferences window
     * @param settings - GSettings for checking notification toggle
     * @param issue - The issue to report
     * @param logFunction - Optional logger function for fallback
     */
    report(
        window: WindowWidget,
        settings: Gio.Settings,
        issue: IssueReport,
        logFunction?: (message: string) => void,
    ): void {
        if (!settings.get_boolean('show-issue-notifications')) {
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
        if (typeof window?.add_toast === 'function') {
            window.add_toast(toast);
            return;
        }

        // Fallback logging when toast API is unavailable
        const fallbackLog = logFunction ?? globalThis.console?.warn;
        fallbackLog?.(
            `[per-monitor-screen-blank] WARN: preferences issue notification unavailable | ${JSON.stringify(
                {
                    issueLevel: issue.level,
                    issueMessage: issue.message,
                    windowType: window?.constructor?.name ?? typeof window,
                },
            )}`,
        );
    }
}
