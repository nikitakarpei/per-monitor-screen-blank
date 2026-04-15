const PREFIX = '[per-monitor-screen-blank]';
let issueReporter;

export function logInfo(message, details) {
    if (details === undefined) {
        log(`${PREFIX} INFO: ${message}`);
        return;
    }

    log(`${PREFIX} INFO: ${message} | ${_serialize(details)}`);
}

export function logWarn(message, details) {
    if (details === undefined) {
        log(`${PREFIX} WARN: ${message}`);
    } else {
        log(`${PREFIX} WARN: ${message} | ${_serialize(details)}`);
    }

    _reportIssue({
        level: 'warn',
        message,
        details,
    });
}

export function logErrorWithContext(error, message, details) {
    const detailText = details === undefined ? '' : ` | ${_serialize(details)}`;
    logError(error, `${PREFIX} ERROR: ${message}${detailText}`);
    _reportIssue({
        level: 'error',
        message,
        details,
        error,
    });
}

export function setIssueReporter(reporter) {
    issueReporter = reporter;
}

function _serialize(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function _reportIssue(issue) {
    if (!issueReporter) {
        return;
    }
    try {
        issueReporter({
            ...issue,
            detailText:
                issue.details === undefined ? '' : _serialize(issue.details),
            errorText: issue.error?.message ?? String(issue.error ?? ''),
        });
    } catch {
        // Avoid recursive logging if notification/reporting itself fails.
    }
}
