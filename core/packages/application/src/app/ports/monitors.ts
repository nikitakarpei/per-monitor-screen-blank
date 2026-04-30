import type {
    PointerPosition,
    LogicalMonitorIdentity,
    KnownMonitorEntry,
} from '@pmsb/domain';

export interface PointerSource {
    getPointerPosition(): PointerPosition;
}

export interface MonitorIdentityStore {
    upsert(entry: { monitorId: string; label: string }): void;
    remove(monitorId: string): void;
    listIds(): readonly string[];
    list(): readonly KnownMonitorEntry[];
}

export interface ConnectedMonitorsQuery {
    listConnectedMonitors(): readonly LogicalMonitorIdentity[];
}
