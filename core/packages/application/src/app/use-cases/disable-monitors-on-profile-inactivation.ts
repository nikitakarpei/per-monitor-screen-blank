import type { LoggerPort } from '../../util/logger.js';
import type { MonitorRegistry } from '../services/monitor-registry.js';

interface DisableMonitorsOnProfileInactivationDeps {
    readonly monitorRegistry: MonitorRegistry;
    readonly logger: LoggerPort;
}

export function disableMonitorsOnProfileInactivation(
    deps: DisableMonitorsOnProfileInactivationDeps,
): void {
    const managedMonitors = deps.monitorRegistry.getAll();
    if (managedMonitors.length === 0) {
        return;
    }

    deps.logger.info('profile-inactivated: disabling all managed monitors');

    for (const monitor of managedMonitors) {
        void deps.monitorRegistry.transitionState(
            monitor.id,
            'Disabled',
            'profile-inactivated',
        );
    }
}
