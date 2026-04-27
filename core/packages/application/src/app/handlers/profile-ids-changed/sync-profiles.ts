import { QuickSettings, SettingsGateway } from '../../../app/ports/settings.js';

interface SyncProfilesDeps {
    readonly quickSettings: QuickSettings;
    readonly gateway: SettingsGateway;
}

/**
 * Handles the 'profile-ids-changed' event by syncing the profiles
 * in the quick settings UI to reflect the current profile list.
 */
export function syncProfiles(_payload: void, deps: SyncProfilesDeps): void {
    deps.quickSettings.syncProfiles(
        deps.gateway.getProfiles(),
        deps.gateway.getActiveProfileId(),
    );
}
