import { type MonitorMode, resolveMode } from '@pmsb/domain';
import { type LoggerPort } from '../../util/logger.js';
import { type MonitorRegistry } from '../services/monitor-registry.js';
import { type ModeStateResolver } from '../services/mode-state-resolver.js';
import { type ProfileSettings } from '../ports/profile-settings.js';

interface ApplyProfileModesToMonitorsDeps {
    readonly profileSettings: ProfileSettings;
    readonly monitorRegistry: MonitorRegistry;
    readonly logger: LoggerPort;
    readonly modeStateResolver: ModeStateResolver;
}

export function applyProfileModesToMonitors(
    deps: ApplyProfileModesToMonitorsDeps,
    profileId: string,
): void {
    const profile = deps.profileSettings
        .getProfiles()
        .find((p) => p.id === profileId);
    if (!profile) {
        deps.logger.warn(
            `apply-profile-modes-to-monitors: profile not found for id ${profileId}`,
        );
        return;
    }
    const newModes = profile.monitorModes;
    for (const entity of deps.monitorRegistry.getAll()) {
        const mode: MonitorMode = resolveMode(newModes[entity.id]);
        void deps.monitorRegistry.transitionState(
            entity.id,
            deps.modeStateResolver.initialStateForMode(mode, entity.id),
            'profile-switched',
        );
        deps.profileSettings.setMonitorMode(profileId, entity.id, mode);
    }
}
