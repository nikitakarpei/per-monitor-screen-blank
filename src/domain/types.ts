import { DeadlineKey } from './deadline-keys.js';
import { MonitorMode } from './monitor-mode.js';

// ProfileId is a string type alias for type safety in profile-related functions
// eslint-disable-next-line sonarjs/redundant-type-aliases -- Intentional type alias for domain clarity
export type ProfileId = string;

export interface Profile {
    readonly id: ProfileId;
    readonly name: string;
    readonly monitorModes: Record<string, MonitorMode>;
}

export interface MonitorIdentity {
    readonly index: number;
    readonly monitorId: string;
    readonly connector: string;
    readonly vendor?: string;
    readonly product?: string;
}

export interface PointerPosition {
    readonly x: number;
    readonly y: number;
    readonly monitorId: string;
}

export interface Deadline {
    readonly deadlineKey: DeadlineKey;
    readonly monitorId: string;
    readonly token: number;
    readonly deadlineMs: number;
}
