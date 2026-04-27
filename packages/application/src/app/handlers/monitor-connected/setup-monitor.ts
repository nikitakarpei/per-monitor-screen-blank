import { MonitorRegistry } from '../../services/monitor-registry.js';
import { type LoggerPort } from '../../../util/logger.js';
import { MonitorConnectedEvent } from '../../../app/ports/platform-events.js';
import { SettingsGateway } from '../../../app/ports/settings.js';
import { type MonitorMode } from '@pmsb/core';
import { ModeStateResolver } from '../../services/mode-state-resolver.js';

interface SetupMonitorDeps {
    monitorRegistry: MonitorRegistry;
    logger: LoggerPort;
    settingsGateway: SettingsGateway;
    modeStateResolver: ModeStateResolver;
}

/**
 * Handles the 'monitor-connected' event by setting up a new monitor.
 */
export function setupMonitor(
    deps: SetupMonitorDeps,
    payload: MonitorConnectedEvent['payload'],
): void {
    deps.monitorRegistry.create(payload.monitorId);
    deps.logger.info(
        `setup-monitor: monitor registered (id=${payload.monitorId})`,
    );

    const mode: MonitorMode = deps.settingsGateway.getMonitorMode(
        payload.monitorId,
    );
    deps.logger.info(
        `setup-monitor: applying mode ${mode} to ${payload.monitorId}`,
    );

    void deps.monitorRegistry.transitionState(
        payload.monitorId,
        deps.modeStateResolver.initialStateForMode(mode, payload.monitorId),
        'monitor-connected',
    );
}
