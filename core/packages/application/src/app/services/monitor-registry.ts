import { MonitorEntity, tryTransition, type MonitorState } from '@pmsb/domain';
import { LoggerPort } from '../../util/logger.js';
import { AppEventBus } from './app-event-bus.js';

interface MonitorRegistryDeps {
    logger: LoggerPort;
    bus: AppEventBus;
}

export class MonitorRegistry {
    private _entries = new Map<string, MonitorEntity>();
    private readonly _logger: LoggerPort;
    private readonly _bus: AppEventBus;

    constructor(deps: MonitorRegistryDeps) {
        this._logger = deps.logger;
        this._bus = deps.bus;
    }

    get(id: string): Readonly<MonitorEntity> {
        const entry = this._entries.get(id);
        if (!entry) {
            throw new Error(`MonitorRegistry: no entry for monitor "${id}"`);
        }
        return entry;
    }

    tryGet(id: string): Readonly<MonitorEntity> | undefined {
        return this._entries.get(id);
    }

    has(id: string): boolean {
        return this._entries.has(id);
    }

    create(id: string): void {
        const existing = this._entries.get(id);
        if (existing) {
            throw new Error(
                `monitor registry create failed: entry already exists (id=${id})`,
            );
        }

        const entry = new MonitorEntity(id, undefined);
        void this._entries.set(id, entry);
    }

    transitionState(
        monitorId: string,
        newState: MonitorState,
        reason: string,
    ): Readonly<MonitorEntity> {
        const entity = this._entries.get(monitorId);
        if (!entity) {
            throw new Error(
                `MonitorRegistry: no entry for monitor "${monitorId}"`,
            );
        }

        const transition = tryTransition(entity.state, newState);
        if (transition === undefined) {
            this._logger.info(
                `monitor registry skipped no-op transition (id=${monitorId}, state=${entity.state}, reason=${reason})`,
            );
            return entity;
        }

        entity.state = transition.current;

        this._logger.info(
            `monitor registry transitioned state (id=${monitorId}, previous=${transition.previous}, current=${transition.current}, reason=${reason})`,
        );

        this._bus.emit({
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
        this._entries.delete(id);
    }

    clear(): void {
        this._entries.clear();
    }

    getAll(): MonitorEntity[] {
        return [...this._entries.values()];
    }
}
