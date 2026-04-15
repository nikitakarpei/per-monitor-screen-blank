import { normalizeMode } from './monitor-modes.js';

export function buildMonitorIdentity({
    vendor = '',
    product = '',
    serial = '',
} = {}) {
    const id = buildStableMonitorId({ vendor, product, serial });
    return {
        id,
        isStable: Boolean(id),
    };
}

function buildStableMonitorId({ vendor = '', product = '', serial = '' } = {}) {
    const vendorKey = _normalizeIdentityPart(vendor);
    const productKey = _normalizeIdentityPart(product);
    const serialKey = _normalizeIdentityPart(serial);
    if (!serialKey) {
        return '';
    }

    return `monitor:${_encodeIdentityPart(vendorKey)}:${_encodeIdentityPart(productKey)}:${_encodeIdentityPart(serialKey)}`;
}

export function resolveMonitorMode(
    monitorModes,
    monitorIdentity,
    fallback = 'disabled',
) {
    const id = _getMonitorId(monitorIdentity);
    if (!id || !Object.hasOwn(monitorModes ?? {}, id)) {
        return fallback;
    }
    return normalizeMode(monitorModes[id], fallback);
}

export function assignMonitorMode(monitorModes, monitorIdentity, mode) {
    const id = _getMonitorId(monitorIdentity);
    const sourceMonitorModes = monitorModes ?? {};
    if (!id) {
        return { ...sourceMonitorModes };
    }
    return {
        ...sourceMonitorModes,
        [id]: normalizeMode(mode),
    };
}

function _getMonitorId(monitorIdentity) {
    if (!monitorIdentity) {
        return '';
    }

    if (typeof monitorIdentity === 'string') {
        return monitorIdentity.trim();
    }

    return String(monitorIdentity.id ?? '').trim();
}

function _normalizeIdentityPart(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}

function _encodeIdentityPart(value) {
    return encodeURIComponent(String(value ?? ''));
}

export function normalizeConnector(connector) {
    return String(connector ?? '')
        .trim()
        .toLowerCase();
}

export function buildMonitorLabel({
    manufacturer = '',
    model = '',
    connector = '',
} = {}) {
    const descriptor = [manufacturer, model]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ');
    const connectorSuffix = connector ? ` (${connector})` : '';
    return descriptor
        ? `${descriptor}${connectorSuffix}`
        : connector || 'Unknown Monitor';
}
