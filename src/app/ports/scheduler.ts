import { DeadlineKey } from '../../domain/deadline-keys.js';

export type DeadlineScheduler = {
    cancel(key: DeadlineKey, monitorId: string): void;
    cancelMonitor(monitorId: string): void;
    schedule(key: DeadlineKey, monitorId: string, deadlineMs: number): void;
};
