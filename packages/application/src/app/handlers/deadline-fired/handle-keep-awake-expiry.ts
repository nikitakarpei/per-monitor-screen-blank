import { SettingsGateway } from '../../ports/settings.js';
import { MonitorRegistry } from '../../services/monitor-registry.js';
import { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import { DEADLINE_KEYS } from '@pmsb/core';
import { type LoggerPort } from '../../../util/logger.js';
import { AppEventBus } from '../../services/app-event-bus.js';

interface HandleKeepAwakeExpiryDeps {
    logger: LoggerPort;
    monitorRegistry: MonitorRegistry;
    settingsGateway: SettingsGateway;
    deadlineScheduler: DeadlineScheduler;
    bus: AppEventBus;
}

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
