import type {
    ProfileNameChangedEvent,
    QuickSettings,
    SettingsGateway,
} from '../../../ports/index.js';

interface SyncProfilesDeps {
    quickSettings: QuickSettings;
    gateway: SettingsGateway;
}

/**
 * Handles the 'profile-name-changed' event by syncing the profiles
 * in the quick settings UI to reflect the updated profile name.
 */
export function syncProfiles(
    _payload: ProfileNameChangedEvent['payload'],
    deps: SyncProfilesDeps,
): void {
    deps.quickSettings.syncProfiles(
        deps.gateway.getProfiles(),
        deps.gateway.getActiveProfileId(),
    );
}
