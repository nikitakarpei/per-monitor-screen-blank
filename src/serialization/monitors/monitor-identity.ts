export function buildMonitorIdentity({
    vendor,
    product,
    serial,
}: {
    vendor: string;
    product: string;
    serial: string;
}): string {
    const vendorKey = canonicalizeIdentityPart(vendor);
    const productKey = canonicalizeIdentityPart(product);
    const serialKey = canonicalizeIdentityPart(serial);

    return `monitor:${encodeIdentityPart(vendorKey)}:${encodeIdentityPart(productKey)}:${encodeIdentityPart(serialKey)}`;
}

function canonicalizeIdentityPart(value: string): string {
    return value.trim().toLowerCase();
}

function encodeIdentityPart(value: string): string {
    return encodeURIComponent(value);
}
