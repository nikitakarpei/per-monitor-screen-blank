import { ProfileNameChangedEvent } from '../../../app/ports/platform-events.js';
import { QuickSettings, SettingsGateway } from '../../../app/ports/settings.js';

interface SyncProfilesDeps {
    readonly quickSettings: QuickSettings;
    readonly gateway: SettingsGateway;
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
