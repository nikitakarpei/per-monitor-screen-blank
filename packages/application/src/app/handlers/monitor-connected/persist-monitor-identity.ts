import { buildMonitorLabel, type PhysicalMonitorInfo } from '@pmsb/core';
import { MonitorIdentityStore } from '../../../app/ports/monitors.js';
import { type LoggerPort } from '../../../util/logger.js';

type PersistMonitorIdentityPayload = {
    monitorId: string;
    physicalMonitors: readonly PhysicalMonitorInfo[];
};

interface PersistMonitorIdentityDeps {
    readonly identityStore: MonitorIdentityStore;
    readonly logger: LoggerPort;
}

export function persistMonitorIdentity(
    deps: PersistMonitorIdentityDeps,
    payload: PersistMonitorIdentityPayload,
): void {
    const label = buildMonitorLabel(payload.physicalMonitors);
    deps.identityStore.upsert({
        monitorId: payload.monitorId,
        label,
    });
    deps.logger.info(`monitor identity persisted: ${payload.monitorId}`);
}
