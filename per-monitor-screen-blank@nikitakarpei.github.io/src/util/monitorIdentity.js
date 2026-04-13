import { normalizeMode } from './monitorModes.js';

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

export function buildStableMonitorId({ vendor = '', product = '', serial = '' } = {}) {
    const vendorKey = _normalizeIdentityPart(vendor);
    const productKey = _normalizeIdentityPart(product);
    const serialKey = _normalizeIdentityPart(serial);
    if (!serialKey)
        return '';

    return `monitor:${_encodeIdentityPart(vendorKey)}:${_encodeIdentityPart(productKey)}:${_encodeIdentityPart(serialKey)}`;
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

function _normalizeIdentityPart(value) {
    return String(value ?? '').trim().toLowerCase();
}

function _encodeIdentityPart(value) {
    return encodeURIComponent(String(value ?? ''));
}

export function normalizeConnector(connector) {
    return String(connector ?? '').trim().toLowerCase();
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
