import { DEFAULTS } from '../core/defaults.js';
import { normalizeKeepAwakeMinutes } from '../core/modeLogic.js';
import { sanitizeMonitorModes } from '../util/monitorModes.js';
import { ensureActiveProfileId, sanitizeProfiles } from '../util/profileConfig.js';
import { normalizeRuntimeMode } from '../util/runtimeMode.js';

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
        wakeOnPointerEntry: raw.wakeOnPointerEntry ?? true,
        fadeDurationMs: Number.isFinite(raw.fadeDurationMs) ? raw.fadeDurationMs : DEFAULTS.fadeDurationMs,
        runtimeMode: normalizeRuntimeMode(raw.runtimeMode),
    });
}
