import { normalizeMode } from './monitorModes.js';

export function buildMonitorIdentity({ index = 0, connector = '' } = {}) {
    const normalizedConnector = String(connector ?? '').trim().toLowerCase();
    if (!normalizedConnector)
        return { id: `monitor:${Math.max(0, Number.parseInt(index, 10) || 0)}` };

    return {
        id: `connector:${normalizedConnector}`,
    };
}

export function resolveMonitorMode(monitorModes, monitorIdentity, fallback = 'disabled') {
    const id = _getMonitorId(monitorIdentity);
    if (!id || !Object.hasOwn(monitorModes ?? {}, id))
        return fallback;
    return normalizeMode(monitorModes[id], fallback);
}

export function assignMonitorMode(monitorModes, monitorIdentity, mode) {
    const id = _getMonitorId(monitorIdentity);
    if (!id)
        return { ...(monitorModes ?? {}) };
    return {
        ...(monitorModes ?? {}),
        [id]: normalizeMode(mode),
    };
}

function _getMonitorId(monitorIdentity) {
    if (!monitorIdentity)
        return '';

    if (typeof monitorIdentity === 'string')
        return monitorIdentity.trim();

    return String(monitorIdentity.id ?? '').trim();
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
