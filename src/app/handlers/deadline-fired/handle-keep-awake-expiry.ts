import type { SettingsGateway } from '../../../ports/index.js';
import type { MonitorRegistry } from '../../services/monitor-registry.js';
import type { DeadlineScheduler } from '../../../domain/ports-domain.js';
import { DEADLINE_KEYS } from '../../../domain/deadline-keys.js';
import { Logger } from '../../../util/logger.js';
import type { AppEventBus } from '../../services/app-event-bus.js';

type HandleKeepAwakeExpiryDeps = {
    logger: Logger;
    monitorRegistry: MonitorRegistry;
    settingsGateway: SettingsGateway;
    deadlineScheduler: DeadlineScheduler;
    bus: AppEventBus;
};

/**
 * Handles the 'keep-awake-expiry-fired' event by transitioning the monitor to Auto mode.
 */
export function handleKeepAwakeExpiry(
    deps: HandleKeepAwakeExpiryDeps,
    payload: {
        monitorId: string;
        deadlineKey: string;
        token: number;
        deadlineMs: number;
    },
): void {
    if (payload.deadlineKey !== DEADLINE_KEYS.keepAwakeExpiry) {
        return;
    }

    const entity = deps.monitorRegistry.get(payload.monitorId);

    if (entity.state !== 'KeepAwake') {
        deps.logger.info(
            `keep-awake expiry skipped: stale deadline | monitorId=${payload.monitorId} state=${entity.state}`,
        );
        return;
    }

    deps.settingsGateway.setMonitorMode(payload.monitorId, 'auto');
}
