import { IssueReport } from './logger.js';

export function buildIssueNotificationText(issue: Pick<IssueReport, 'level'>) {
    const title =
        issue.level === 'error'
            ? 'Per-Monitor Screen Blank: Error'
            : 'Per-Monitor Screen Blank: Warning';
    const body =
        'Something went wrong, and some functionality might not work as expected. Please open Extension Logs for details.';

    return {
        title,
        body,
        toastTitle: body,
    };
}
