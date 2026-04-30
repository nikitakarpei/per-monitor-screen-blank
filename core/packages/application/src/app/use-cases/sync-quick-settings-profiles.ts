import { type LoggerPort } from '../../util/logger.js';
import { type ProfileSettings } from '../ports/profile-settings.js';
import { type QuickSettings } from '../ports/settings.js';

interface SyncQuickSettingsProfilesDeps {
    readonly quickSettings: QuickSettings;
    readonly profileSettings: ProfileSettings;
    readonly logger: LoggerPort;
}

export function syncQuickSettingsProfiles(
    deps: SyncQuickSettingsProfilesDeps,
    source: string,
): void {
    const profiles = deps.profileSettings.getProfiles();
    const activeProfile = deps.profileSettings.getActiveProfile();
    if (!activeProfile) {
        deps.logger.warn(
            `syncProfiles (${source}): active profile not found, skipping sync`,
        );
        return;
    }
    deps.quickSettings.syncProfiles(profiles, activeProfile.id);
}
