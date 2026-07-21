export interface IssueNotificationText {
    title: string;
    body: string;
    toastTitle: string;
}

export function buildIssueNotificationText(
    level: 'warn' | 'error',
    message: string,
): IssueNotificationText {
    const title =
        level === 'error'
            ? 'Per-Monitor Screen Blank: Error'
            : 'Per-Monitor Screen Blank: Warning';
    const body = message;

    return {
        title,
        body,
        toastTitle: body,
    };
}
