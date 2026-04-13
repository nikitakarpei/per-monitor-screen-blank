import { createSettingsSnapshot } from '../domain/SettingsSnapshot.js';
import { normalizeMode, parseMonitorModes, stringifyMonitorModes } from '../util/monitorModes.js';
import { logWarn } from '../util/logger.js';
import {
    createProfileId,
    defaultProfiles,
    ensureActiveProfileId,
    parseProfiles,
    stringifyProfiles,
} from '../util/profileConfig.js';

export class GSettingsGateway {
    constructor(settings) {
        this._settings = settings;
    }

    connectChanged(handler) {
        const id = this._settings.connect('changed', handler);
        return () => this._settings.disconnect(id);
    }

    get settings() {
        return this._settings;
    }

    getSnapshot() {
        const normalized = this._ensureProfiles();
        return createSettingsSnapshot({
            profiles: normalized.profiles,
            activeProfileId: normalized.activeProfileId,
            idleTimeoutSeconds: this._settings.get_int('idle-timeout-seconds'),
            keepAwakeMinutes: this._settings.get_int('keep-awake-minutes'),
            showIndicator: this._settings.get_boolean('show-indicator'),
            wakeOnPointerEntry: this._settings.get_boolean('wake-on-pointer-entry'),
            fadeDurationMs: this._settings.get_int('fade-duration-ms'),
        });
    }

    setMonitorMode(monitorId, mode) {
        const key = String(monitorId ?? '').trim();
        if (!key) {
            logWarn('setMonitorMode called with empty monitorId');
            return;
        }
        const { profiles, activeProfileId } = this._ensureProfiles();
        const nextProfiles = profiles.map(profile => {
            if (profile.id !== activeProfileId) return profile;
            const nextModes = { ...profile.monitorModes };
            nextModes[key] = normalizeMode(mode);
            return { ...profile, monitorModes: nextModes };
        });
        this._settings.set_string('profiles-json', stringifyProfiles(nextProfiles));
    }

    setMonitorModes(monitorModes) {
        const { profiles, activeProfileId } = this._ensureProfiles();
        const normalizedModes = parseMonitorModes(stringifyMonitorModes(monitorModes));
        const nextProfiles = profiles.map(profile => profile.id === activeProfileId
            ? { ...profile, monitorModes: normalizedModes }
            : profile);
        this._settings.set_string('profiles-json', stringifyProfiles(nextProfiles));
    }

    setActiveProfile(profileId) {
        const { profiles } = this._ensureProfiles();
        const activeProfileId = ensureActiveProfileId(profiles, profileId);
        if (activeProfileId !== profileId)
            logWarn('requested profile not found, falling back', { requested: profileId, activeProfileId });
        this._settings.set_string('active-profile-id', activeProfileId);
    }

    createProfile(name) {
        const { profiles } = this._ensureProfiles();
        const trimmedName = String(name ?? '').trim() || `Profile ${profiles.length + 1}`;
        const id = createProfileId(trimmedName, profiles);
        const nextProfiles = [...profiles, { id, name: trimmedName, monitorModes: {} }];
        this._settings.set_string('profiles-json', stringifyProfiles(nextProfiles));
        this._settings.set_string('active-profile-id', id);
        return id;
    }

    _ensureProfiles() {
        const profilesRaw = this._settings.get_string('profiles-json');
        let profiles = parseProfiles(profilesRaw);
        if (!profilesRaw || profilesRaw === '[]') {
            profiles = defaultProfiles();
            this._settings.set_string('profiles-json', stringifyProfiles(profiles));
        }
        const activeProfileId = ensureActiveProfileId(profiles, this._settings.get_string('active-profile-id'));
        if (this._settings.get_string('active-profile-id') !== activeProfileId)
            this._settings.set_string('active-profile-id', activeProfileId);
        return { profiles, activeProfileId };
    }
}
