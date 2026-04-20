import { DEFAULT_MONITOR_MODE, type MonitorMode } from './monitor-mode.js';

/** Resolve mode for a known monitor id from a domain-only mode map. */
export function resolveMonitorMode(
    monitorModes: Record<string, MonitorMode>,
    monitorId: string,
): MonitorMode {
    const mode = monitorModes[monitorId];
    if (!mode) {
        return DEFAULT_MONITOR_MODE;
    }
    return mode;
}

export function buildMonitorLabel(identity: {
    vendor?: string;
    product?: string;
    connector: string;
}): string {
    const descriptor = [identity.vendor, identity.product]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ');
    const connectorSuffix = ` (${identity.connector})`;
    return descriptor
        ? `${descriptor}${connectorSuffix}`
        : `Unknown Monitor (${identity.connector})`;
}
