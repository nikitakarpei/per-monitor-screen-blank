const PREFIX = '[per-monitor-screen-blank]';
let issueReporter = null;

export function logInfo(message, details = null) {
    if (details !== null)
        log(`${PREFIX} INFO: ${message} | ${_serialize(details)}`);
    else
        log(`${PREFIX} INFO: ${message}`);
}

export function logWarn(message, details = null) {
    if (details !== null)
        log(`${PREFIX} WARN: ${message} | ${_serialize(details)}`);
    else
        log(`${PREFIX} WARN: ${message}`);
    _reportIssue({
        level: 'warn',
        message,
        details,
        error: null,
    });
}

export function logErrorWithContext(error, message, details = null) {
    const detailText = details !== null ? ` | ${_serialize(details)}` : '';
    logError(error, `${PREFIX} ERROR: ${message}${detailText}`);
    _reportIssue({
        level: 'error',
        message,
        details,
        error,
    });
}

export function setIssueReporter(reporter) {
    issueReporter = reporter ?? null;
}

function _serialize(value) {
    try {
        return JSON.stringify(value);
    } catch (_) {
        return String(value);
    }
}

function _reportIssue(issue) {
    if (!issueReporter)
        return;
    try {
        issueReporter({
            ...issue,
            detailText: issue.details !== null ? _serialize(issue.details) : '',
            errorText: issue.error?.message ?? String(issue.error ?? ''),
        });
    } catch (_) {
        // Avoid recursive logging if notification/reporting itself fails.
    }
}
