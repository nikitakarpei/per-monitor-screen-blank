export function monitorIdFromIndex(index = 0) {
    return `monitor:${Math.max(0, Number.parseInt(index, 10) || 0)}`;
}

export function buildMonitorLabel({
    ordinal = 1,
    manufacturer = '',
    model = '',
    connector = '',
    isPrimary = false,
} = {}) {
    const descriptor = [manufacturer, model].map(part => String(part ?? '').trim()).filter(Boolean).join(' ');
    const connectorSuffix = connector ? ` (${connector})` : '';
    const primarySuffix = isPrimary ? ' [Primary]' : '';
    const title = descriptor ? `Monitor ${ordinal}: ${descriptor}` : `Monitor ${ordinal}`;
    return `${title}${connectorSuffix}${primarySuffix}`;
}
