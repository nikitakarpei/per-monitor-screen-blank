import { sanitizeMonitorModes } from './monitor-modes.js';

const DEFAULT_PROFILE_ID = 'default';
const DEFAULT_PROFILE_NAME = 'Default';

function normalizeProfile(raw) {
    const id = String(raw?.id ?? '').trim();
    const profile = id ? {
        id,
        name: String(raw?.name ?? '').trim() || id,
        monitorModes: sanitizeMonitorModes(raw?.monitorModes),
    } : undefined;
    return profile;
}

export function defaultProfiles() {
    return [{
        id: DEFAULT_PROFILE_ID,
        name: DEFAULT_PROFILE_NAME,
        monitorModes: {},
    }];
}

export function parseProfiles(rawValue) {
    if (!rawValue) return defaultProfiles();
    try {
        const parsed = JSON.parse(rawValue);
        if (!Array.isArray(parsed)) return defaultProfiles();
        const profiles = parsed.map(profile => normalizeProfile(profile)).filter(Boolean);
        return profiles.length > 0 ? profiles : defaultProfiles();
    } catch {
        return defaultProfiles();
    }
}

export function stringifyProfiles(profiles) {
    return JSON.stringify(sanitizeProfiles(profiles));
}

export function sanitizeProfiles(profiles) {
    if (!Array.isArray(profiles)) return defaultProfiles();
    const normalized = profiles.map(profile => normalizeProfile(profile)).filter(Boolean);
    if (normalized.length === 0) return defaultProfiles();
    const unique = [];
    const seen = new Set();
    for (const profile of normalized) {
        if (seen.has(profile.id)) continue;
        seen.add(profile.id);
        unique.push(profile);
    }
    return unique;
}

export function ensureActiveProfileId(profiles, activeProfileId) {
    const active = String(activeProfileId ?? '').trim();
    if (profiles.some(profile => profile.id === active))
        {return active;}
    return profiles[0]?.id ?? DEFAULT_PROFILE_ID;
}

export function createProfileId(name, existingProfiles) {
    const slug = String(name ?? '')
        .trim()
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-');
    const base = slug.split('-').filter(Boolean).join('-') || 'profile';
    const existing = new Set((existingProfiles ?? []).map(profile => profile.id));
    if (!existing.has(base)) return base;
    let index = 2;
    while (existing.has(`${base}-${index}`))
        {index += 1;}
    return `${base}-${index}`;
}
