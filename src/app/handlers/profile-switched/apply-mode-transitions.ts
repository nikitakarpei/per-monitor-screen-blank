import type {
    ProfileSwitchedEvent,
    SettingsGateway,
} from '../../../ports/index.js';
import { MonitorRegistry } from '../../services/monitor-registry.js';
import { resolveMode } from '../../../domain/monitor-mode.js';
import { LoggerPort } from '../../../util/logger.js';
import { ModeStateResolver } from '../../services/mode-state-resolver.js';

interface ApplyModeTransitionsDeps {
    gateway: SettingsGateway;
    monitorRegistry: MonitorRegistry;
    logger: LoggerPort;
    modeStateResolver: ModeStateResolver;
}

/**
 * Handles the 'profile-switched' event by applying mode transitions.
 * Sets the mode for all monitors to the mode from the new profile.
 */
export function applyModeTransitions(
    deps: ApplyModeTransitionsDeps,
    payload: ProfileSwitchedEvent['payload'],
): void {
    const newModes = deps.gateway.getMonitorModes(payload.profileId);
    for (const entity of deps.monitorRegistry.getAll()) {
        const mode = resolveMode(newModes[entity.id]);
        void deps.monitorRegistry.transitionState(
            entity.id,
            deps.modeStateResolver.initialStateForMode(mode, entity.id),
            'profile-switched',
        );
        deps.gateway.setMonitorMode(entity.id, mode);
    }
}
