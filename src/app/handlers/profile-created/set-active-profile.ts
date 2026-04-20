import { ProfileCreatedEvent, SettingsGateway } from '../../../ports';

interface SetActiveProfileDeps {
    settingsGateway: SettingsGateway;
}

/**
 * Handles the 'profile-created' event by setting the active profile.
 */
export function setActiveProfile(
    deps: SetActiveProfileDeps,
    payload: ProfileCreatedEvent['payload'],
): void {
    deps.settingsGateway.setActiveProfile(payload.profileId);
}
