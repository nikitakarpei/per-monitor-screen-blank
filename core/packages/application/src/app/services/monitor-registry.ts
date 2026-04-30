import { MonitorEntity, tryTransition, type MonitorState } from '@pmsb/domain';
import type { Disposable } from '@pmsb/lifecycle';
import { LoggerPort } from '../../util/logger.js';
import { AppEventBus } from './app-event-bus.js';

export class MonitorRegistry implements Disposable {
    readonly #logger: LoggerPort;
    readonly #bus: AppEventBus;
    readonly #entries = new Map<string, MonitorEntity>();

    constructor(logger: LoggerPort, bus: AppEventBus) {
        this.#logger = logger;
        this.#bus = bus;
    }

    get(id: string): Readonly<MonitorEntity> {
        const entry = this.#entries.get(id);
        if (!entry) {
            throw new Error(`MonitorRegistry: no entry for monitor "${id}"`);
        }
        return entry;
    }

    tryGet(id: string): Readonly<MonitorEntity> | undefined {
        return this.#entries.get(id);
    }

    has(id: string): boolean {
        return this.#entries.has(id);
    }

    create(id: string): void {
        const existing = this.#entries.get(id);
        if (existing) {
            throw new Error(
                `monitor registry create failed: entry already exists (id=${id})`,
            );
        }

        const entry = new MonitorEntity(id, undefined);
        void this.#entries.set(id, entry);
    }

    transitionState(
        monitorId: string,
        newState: MonitorState,
        reason: string,
    ): Readonly<MonitorEntity> {
        const entity = this.#entries.get(monitorId);
        if (!entity) {
            throw new Error(
                `MonitorRegistry: no entry for monitor "${monitorId}"`,
            );
        }

        const transition = tryTransition(entity.state, newState);
        if (transition === undefined) {
            this.#logger.info(
                `monitor registry skipped no-op transition (id=${monitorId}, state=${entity.state}, reason=${reason})`,
            );
            return entity;
        }

        entity.state = transition.current;

        this.#bus.emit({
            type: 'state-changed',
            payload: {
                monitorId,
                previous: transition.previous,
                current: transition.current,
                reason,
            },
        });

        return entity;
    }

    remove(id: string): void {
        this.#entries.delete(id);
    }

    dispose(): void {
        this.#entries.clear();
    }

    getAll(): MonitorEntity[] {
        return [...this.#entries.values()];
    }
}
