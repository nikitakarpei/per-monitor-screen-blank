import { type DeadlineKey } from '@pmsb/core';

export type DeadlineScheduler = {
    cancel(key: DeadlineKey, monitorId: string): void;
    cancelMonitor(monitorId: string): void;
    schedule(key: DeadlineKey, monitorId: string, deadlineMs: number): void;
};
