import { ProfileSettings } from '../../ports/profile-settings.js';
import { MonitorRegistry } from '../../services/monitor-registry.js';
import { DeadlineScheduler } from '../../../app/ports/scheduler.js';
import { DEADLINE_KEYS } from '@pmsb/domain';
import { type LoggerPort } from '../../../util/logger.js';
import { AppEventBus } from '../../services/app-event-bus.js';
import { DeadlineFiredEvent } from '../../ports/platform-events.js';

interface HandleKeepAwakeExpiryDeps {
    logger: LoggerPort;
    monitorRegistry: MonitorRegistry;
    profileSettings: ProfileSettings;
    deadlineScheduler: DeadlineScheduler;
    bus: AppEventBus;
}

/**
 * Handles the 'keep-awake-expiry-fired' event by transitioning the monitor to Auto mode.
 */
export function handleKeepAwakeExpiry(
    deps: HandleKeepAwakeExpiryDeps,
    payload: DeadlineFiredEvent['payload'],
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

    const activeProfile = deps.profileSettings.getActiveProfile();
    if (activeProfile === null) {
        deps.logger.warn(
            `keep-awake expiry skipped: no active profile | monitorId=${payload.monitorId}`,
        );
        return;
    }

    deps.profileSettings.setMonitorMode(
        activeProfile.id,
        payload.monitorId,
        'auto',
    );
}
