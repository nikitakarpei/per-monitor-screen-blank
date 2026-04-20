import type {
    MonitorModeChangedEvent,
    QuickSettings,
    SettingsGateway,
} from '../../../ports/index.js';
import { LoggerPort } from '../../../util/logger.js';
import { MonitorRegistry } from '../../services/monitor-registry.js';
import { ModeStateResolver } from '../../services/mode-state-resolver.js';

interface HandleModeChangeDeps {
    gateway: SettingsGateway;
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
    const activeProfileId = deps.gateway.getActiveProfileId();

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
