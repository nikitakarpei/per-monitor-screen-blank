import { ProfileCreatedEvent } from '../../../app/ports/platform-events.js';
import { SettingsGateway } from '../../../app/ports/settings.js';

/**
 * Handles the 'profile-created' event by setting the active profile.
 */
export function setActiveProfile(
    deps: { settingsGateway: SettingsGateway },
    payload: ProfileCreatedEvent['payload'],
): void {
    deps.settingsGateway.setActiveProfile(payload.profileId);
}
