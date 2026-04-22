import { ProfileSwitchedEvent } from '../../../app/ports/platform-events.js';
import { QuickSettings, SettingsGateway } from '../../../app/ports/settings.js';

/**
 * Handles the 'profile-switched' event by syncing the quick settings UI to reflect the current profile.
 */
export function syncQuickSettings(
    deps: {
        quickSettings: QuickSettings;
        gateway: SettingsGateway;
    },
    payload: ProfileSwitchedEvent['payload'],
): void {
    deps.quickSettings.syncProfiles(
        deps.gateway.getProfiles(),
        payload.profileId,
    );
}
