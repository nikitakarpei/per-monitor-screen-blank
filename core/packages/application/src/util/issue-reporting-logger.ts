import { buildIssueNotificationText } from '@pmsb/domain';
import type { LoggerPort } from './logger.js';
import type { UserNotifications } from './user-notifications.js';

type IssueNotificationPolicy = () => boolean;

export class IssueReportingLogger implements LoggerPort {
    constructor(
        private readonly baseLogger: LoggerPort,
        private readonly userNotifications: UserNotifications,
        private readonly shouldShowIssueNotifications: IssueNotificationPolicy,
    ) {}

    info(message: string): void {
        this.baseLogger.info(message);
    }

    warn(message: string): void {
        this.baseLogger.warn(message);
        if (this.shouldShowIssueNotifications()) {
            const result = buildIssueNotificationText('warn', message);
            this.userNotifications.show({
                title: result.toastTitle,
                priority: 'normal',
            });
        }
    }

    error(message: string, exception?: object): void {
        this.baseLogger.error(message, exception);
        if (this.shouldShowIssueNotifications()) {
            const result = buildIssueNotificationText('error', message);
            this.userNotifications.show({
                title: result.toastTitle,
                priority: 'high',
            });
        }
    }
}
