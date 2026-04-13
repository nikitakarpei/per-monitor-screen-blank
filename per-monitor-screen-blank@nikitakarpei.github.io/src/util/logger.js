const PREFIX = '[per-monitor-screen-blank]';

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
}

export function logErrorWithContext(error, message, details = null) {
    const detailText = details !== null ? ` | ${_serialize(details)}` : '';
    logError(error, `${PREFIX} ERROR: ${message}${detailText}`);
}

function _serialize(value) {
    try {
        return JSON.stringify(value);
    } catch (_) {
        return String(value);
    }
}
