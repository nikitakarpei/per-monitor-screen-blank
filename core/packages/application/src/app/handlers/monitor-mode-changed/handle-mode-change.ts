import { MonitorModeChangedEvent } from '../../../app/ports/platform-events.js';
import { QuickSettings } from '../../../app/ports/settings.js';
import { ProfileSettings } from '../../../app/ports/profile-settings.js';
import { LoggerPort } from '../../../util/logger.js';
import { MonitorRegistry } from '../../services/monitor-registry.js';
import { ModeStateResolver } from '../../services/mode-state-resolver.js';

interface HandleModeChangeDeps {
    profileSettings: ProfileSettings;
    monitorRegistry: MonitorRegistry;
    quickSettings: QuickSettings;
    logger: LoggerPort;
    modeStateResolver: ModeStateResolver;
}

/**
 * Handles the 'monitor-mode-changed' event by applying the mode to the monitor.
 */
export function handleModeChange(
    deps: HandleModeChangeDeps,
    payload: MonitorModeChangedEvent['payload'],
): void {
    const activeProfile = deps.profileSettings.getActiveProfile();
    if (!activeProfile) {
        deps.logger.warn(`monitor-mode-changed: no active profile found`);
        return;
    }
    const activeProfileId = activeProfile.id;

    if (payload.profileId !== activeProfileId) {
        deps.logger.info(
            `monitor-mode-changed: mode change for inactive profile: ${payload.profileId}`,
        );
        return;
    }

    void deps.monitorRegistry.transitionState(
        payload.monitorId,
        deps.modeStateResolver.initialStateForMode(
            payload.mode,
            payload.monitorId,
        ),
        'monitor-mode-changed',
    );
}
