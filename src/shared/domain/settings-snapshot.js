import { DEFAULTS } from '../core/defaults.js';
import { normalizeDimIntensityPercent } from '../core/dim-intensity.js';
import { normalizeKeepAwakeMinutes } from '../core/mode-logic.js';
import { sanitizeMonitorModes } from '../util/monitor-modes.js';
import { ensureActiveProfileId, sanitizeProfiles } from '../util/profile-config.js';

export function createSettingsSnapshot(raw) {
    const profiles = sanitizeProfiles(raw.profiles);
    const activeProfileId = ensureActiveProfileId(profiles, raw.activeProfileId);
    const activeProfile = profiles.find(profile => profile.id === activeProfileId) ?? profiles[0];
    return Object.freeze({
        profiles,
        activeProfileId,
        monitorModes: sanitizeMonitorModes(activeProfile?.monitorModes),
        idleTimeoutSeconds: Number.isFinite(raw.idleTimeoutSeconds) ? raw.idleTimeoutSeconds : DEFAULTS.idleTimeoutSeconds,
        keepAwakeMinutes: normalizeKeepAwakeMinutes(raw.keepAwakeMinutes ?? DEFAULTS.keepAwakeMinutes),
        showIndicator: raw.showIndicator ?? true,
        disableAutoTimerOnPointerMonitor: raw.disableAutoTimerOnPointerMonitor ?? false,
        fadeDurationMs: Number.isFinite(raw.fadeDurationMs) ? raw.fadeDurationMs : DEFAULTS.fadeDurationMs,
        dimIntensityPercent: normalizeDimIntensityPercent(raw.dimIntensityPercent ?? DEFAULTS.dimIntensityPercent),
    });
}
