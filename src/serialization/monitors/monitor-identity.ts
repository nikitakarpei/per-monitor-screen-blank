export function buildLogicalMonitorIdentity(
    connectors: readonly string[],
): string {
    const sorted = [...connectors].toSorted((a, b) => a.localeCompare(b));
    const key = sorted
        .map((c) => encodeIdentityPart(canonicalizeIdentityPart(c)))
        .join('+');
    return `logical-monitor:${key}`;
}

function canonicalizeIdentityPart(value: string): string {
    return value.trim().toLowerCase();
}

function encodeIdentityPart(value: string): string {
    return encodeURIComponent(value);
}
