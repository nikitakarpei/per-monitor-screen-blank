import { PhysicalMonitorInfo } from './types.js';

export function buildMonitorLabel(
    physicalMonitors: readonly PhysicalMonitorInfo[],
): string {
    const connectors = physicalMonitors.map((p) => p.connector).join(', ');
    const representative = physicalMonitors[0];
    if (!representative) return `Unknown Monitor (${connectors})`;

    const descriptor = [representative.vendor, representative.product]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' ');
    const connectorSuffix = ` (${connectors})`;
    return descriptor
        ? `${descriptor}${connectorSuffix}`
        : `Unknown Monitor (${connectors})`;
}
