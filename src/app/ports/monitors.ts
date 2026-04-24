import { PointerPosition } from '../../domain/types.js';

export interface PointerSource {
    getPointerPosition(): PointerPosition;
}

export interface MonitorIdentityStore {
    upsert(entry: { monitorId: string; label: string }): void;
    remove(monitorId: string): void;
    listIds(): readonly string[];
}
