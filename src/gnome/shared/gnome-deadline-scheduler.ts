import GLib from 'gi://GLib';
import { DeadlineKey } from '../../domain/deadline-keys.js';
import { DeadlineScheduler } from '../../app/ports/scheduler.js';
import { Logger } from '../../util/logger.js';
import { PlatformEventEmitter } from '../../app/ports/platform-events.js';

/**
 * GNOME-specific implementation of DeadlineScheduler using GLib timeouts.
 * Implements token-based stale callback filtering and proper cleanup.
 */
export class GnomeDeadlineScheduler implements DeadlineScheduler {
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #logger: Logger;
    readonly #entries: Map<string, ScheduleEntry> = new Map();
    readonly #tokens: Map<string, number> = new Map();

    constructor(deps: GnomeDeadlineSchedulerDeps) {
        this.#eventEmitter = deps.eventEmitter;
        this.#logger = deps.logger;
    }

    schedule(
        deadlineKey: DeadlineKey,
        monitorId: string,
        deadlineMs: number,
    ): void {
        this.#scheduleEntry(deadlineKey, monitorId, deadlineMs);
    }

    cancel(deadlineKey: DeadlineKey, monitorId: string): void {
        this.#removeEntry(this.#buildKey(deadlineKey, monitorId));
        this.#logger.info(
            `cancelled deadline (deadlineKey=${deadlineKey}, monitorId=${monitorId})`,
        );
    }

    cancelMonitor(monitorId: string): void {
        const keys = this.#entries
            .entries()
            .filter(([_, entry]) => entry.monitorId === monitorId)
            .map(([key]) => key);
        for (const key of keys) {
            this.#removeEntry(key);
        }
        this.#logger.info(
            `cancelled all deadlines for monitor (monitorId=${monitorId})`,
        );
    }

    cancelAll(): void {
        for (const key of this.#entries.keys()) {
            this.#removeEntry(key);
        }
        this.#logger.info(`cancelled all deadlines`);
    }

    #scheduleEntry(
        deadlineKey: DeadlineKey,
        monitorId: string,
        deadlineMs: number,
    ): void {
        const key = this.#buildKey(deadlineKey, monitorId);
        this.#removeEntry(key);
        const token = (this.#tokens.get(key) ?? 0) + 1;
        this.#tokens.set(key, token);
        const delayMs = Math.max(0, Math.ceil(deadlineMs - Date.now()));
        const sourceId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            delayMs,
            () => {
                const latestToken = this.#tokens.get(key);
                if (latestToken !== token) {
                    this.#logger.warn(
                        'ignored stale monitor deadline callback',
                    );
                    return GLib.SOURCE_REMOVE;
                }
                this.#entries.delete(key);
                this.#tokens.delete(key);
                this.#eventEmitter.emit({
                    type: 'deadline-fired',
                    payload: {
                        deadlineKey,
                        monitorId,
                        token,
                        deadlineMs,
                    },
                });
                return GLib.SOURCE_REMOVE;
            },
        );
        if (!sourceId) {
            this.#tokens.delete(key);
            this.#logger.warn(
                'monitor deadline schedule skipped: no GLib source id',
            );
            return;
        }
        this.#entries.set(key, { sourceId, token, deadlineKey, monitorId });
        this.#logger.info(
            `scheduled deadline (deadlineKey=${deadlineKey}, monitorId=${monitorId})`,
        );
    }

    #removeEntry(key: string): void {
        const entry = this.#entries.get(key);
        if (!entry) return;
        this.#entries.delete(key);
        this.#tokens.delete(key);
        try {
            const removed = GLib.Source.remove(entry.sourceId);
            if (!removed) {
                this.#logger.warn(
                    'failed to remove monitor deadline source: invalid source id',
                );
            }
        } catch {
            this.#logger.warn(
                'failed to remove monitor deadline source: exception',
            );
        }
    }

    #buildKey(deadlineKey: DeadlineKey, monitorId: string): string {
        return `${monitorId}:${deadlineKey}`;
    }
}

type ScheduleEntry = {
    readonly sourceId: number;
    readonly token: number;
    readonly deadlineKey: DeadlineKey;
    readonly monitorId: string;
};

interface GnomeDeadlineSchedulerDeps {
    eventEmitter: PlatformEventEmitter;
    logger: Logger;
}
