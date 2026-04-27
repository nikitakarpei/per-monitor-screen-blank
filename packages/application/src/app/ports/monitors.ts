import { type PointerPosition } from '@pmsb/core';

export interface PointerSource {
    getPointerPosition(): PointerPosition;
}

export interface MonitorIdentityStore {
    upsert(entry: { monitorId: string; label: string }): void;
    remove(monitorId: string): void;
    listIds(): readonly string[];
}
