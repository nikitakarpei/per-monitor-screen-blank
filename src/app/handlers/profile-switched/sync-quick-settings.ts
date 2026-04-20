import {
    ProfileSwitchedEvent,
    QuickSettings,
    SettingsGateway,
} from '../../../ports';

interface SyncQuickSettingsDeps {
    quickSettings: QuickSettings;
    gateway: SettingsGateway;
}

/**
 * Handles the 'profile-switched' event by syncing the quick settings UI to reflect the current profile.
 */
export function syncQuickSettings(
    deps: SyncQuickSettingsDeps,
    payload: ProfileSwitchedEvent['payload'],
): void {
    deps.quickSettings.syncProfiles(
        deps.gateway.getProfiles(),
        payload.profileId,
    );
}
