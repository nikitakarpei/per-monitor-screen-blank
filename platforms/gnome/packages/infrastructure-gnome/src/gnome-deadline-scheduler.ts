import GLib from 'gi://GLib';
import type { Disposable } from '@pmsb/lifecycle';
import type { DeadlineKey } from '@pmsb/domain';
import type {
    DeadlineScheduler,
    LoggerPort,
    PlatformEventEmitter,
} from '@pmsb/application';

export class GnomeDeadlineScheduler implements DeadlineScheduler, Disposable {
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #logger: LoggerPort;
    readonly #entries: Map<string, ScheduleEntry> = new Map();

    constructor(eventEmitter: PlatformEventEmitter, logger: LoggerPort) {
        this.#eventEmitter = eventEmitter;
        this.#logger = logger;
    }

    schedule(
        deadlineKey: DeadlineKey,
        monitorId: string,
        deadlineMs: number,
    ): void {
        const key = this.#buildKey(deadlineKey, monitorId);
        if (this.#entries.has(key)) {
            this.#removeEntry(key);
        }

        const token = GLib.uuid_string_random();
        const delayMs = Math.max(0, Math.ceil(deadlineMs - Date.now()));
        const sourceId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            delayMs,
            () => {
                try {
                    this.#handleTimeout(key, token);
                } catch (error) {
                    this.#logger.error(
                        `failed to handle monitor deadline timeout: ${error}`,
                    );
                }
                return GLib.SOURCE_REMOVE;
            },
        );

        this.#entries.set(key, { sourceId, token, deadlineKey, monitorId });
    }

    cancel(deadlineKey: DeadlineKey, monitorId: string): void {
        this.#removeEntry(this.#buildKey(deadlineKey, monitorId));
    }

    tryCancel(deadlineKey: DeadlineKey, monitorId: string): boolean {
        const key = this.#buildKey(deadlineKey, monitorId);
        if (!this.#entries.has(key)) {
            return false;
        }
        this.#removeEntry(key);
        return true;
    }

    cancelMonitor(monitorId: string): void {
        const keys = this.#entries
            .entries()
            .filter(([_, entry]) => entry.monitorId === monitorId)
            .map(([key]) => key)
            .toArray();
        for (const key of keys) {
            this.#removeEntry(key);
        }
    }

    dispose(): void {
        const keys = this.#entries.keys().toArray();
        for (const key of keys) {
            this.#removeEntry(key);
        }
    }

    #removeEntry(key: string): void {
        const entry = this.#entries.get(key);
        if (!entry) {
            throw new Error(
                `failed to remove monitor deadline entry: entry not found (key=${key})`,
            );
        }
        this.#entries.delete(key);
        const removed = GLib.Source.remove(entry.sourceId);
        if (!removed) {
            throw new Error(
                'failed to remove monitor deadline source: invalid source id',
            );
        }
    }

    #buildKey(deadlineKey: DeadlineKey, monitorId: string): string {
        return `${monitorId}:${deadlineKey}`;
    }

    #handleTimeout(key: string, token: string): void {
        const entry = this.#entries.get(key);
        if (!entry) {
            this.#logger.warn(
                `failed to handle monitor deadline timeout: entry not found (key=${key})`,
            );
            return;
        }
        if (entry.token !== token) {
            this.#logger.info('ignored stale monitor deadline callback');
            return;
        }
        this.#entries.delete(key);

        this.#eventEmitter.emit({
            type: 'deadline-fired',
            payload: {
                deadlineKey: entry.deadlineKey,
                monitorId: entry.monitorId,
                token,
            },
        });
    }
}

type ScheduleEntry = {
    readonly sourceId: number;
    readonly token: string;
    readonly deadlineKey: DeadlineKey;
    readonly monitorId: string;
};
