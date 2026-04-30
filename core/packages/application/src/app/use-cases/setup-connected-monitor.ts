import { type MonitorMode } from '@pmsb/domain';
import { type LoggerPort } from '../../util/logger.js';
import { type MonitorRegistry } from '../services/monitor-registry.js';
import { type ModeStateResolver } from '../services/mode-state-resolver.js';
import { type ProfileSettings } from '../ports/profile-settings.js';

export interface SetupConnectedMonitorDeps {
    readonly monitorRegistry: MonitorRegistry;
    readonly logger: LoggerPort;
    readonly profileSettings: ProfileSettings;
    readonly modeStateResolver: ModeStateResolver;
}

export function setupConnectedMonitor(
    deps: SetupConnectedMonitorDeps,
    monitorId: string,
): void {
    deps.monitorRegistry.create(monitorId);
    deps.logger.info(
        `setup-connected-monitor: monitor registered (id=${monitorId})`,
    );

    const activeProfile = deps.profileSettings.getActiveProfile();
    if (!activeProfile) {
        deps.logger.warn(
            `setup-connected-monitor: no active profile found, cannot apply mode`,
        );
        return;
    }

    const mode: MonitorMode = deps.profileSettings.getMonitorMode(
        activeProfile.id,
        monitorId,
    );
    deps.logger.info(
        `setup-connected-monitor: applying mode ${mode} to ${monitorId}`,
    );

    void deps.monitorRegistry.transitionState(
        monitorId,
        deps.modeStateResolver.initialStateForMode(mode, monitorId),
        'monitor-connected',
    );
}
