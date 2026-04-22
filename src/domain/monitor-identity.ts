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
