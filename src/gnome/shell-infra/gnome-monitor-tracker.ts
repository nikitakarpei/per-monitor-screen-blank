import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { GnomeMonitorQuery } from './gnome-monitor-query.js';
import { LoggerPort } from '../../util/logger.js';
import { PlatformEventEmitter } from '../../app/ports/platform-events.js';
import { GnomeMonitorIndex } from './gnome-monitor-index.js';
import { MonitorIdentityStore } from '../../app/ports/monitors.js';
import { LogicalMonitorIdentity } from '../../domain/types.js';

interface GnomeMonitorTrackerDeps {
    readonly logger: LoggerPort;
    readonly eventEmitter: PlatformEventEmitter;
    readonly identityStore: MonitorIdentityStore;
    readonly monitorQuery: GnomeMonitorQuery;
}

export class GnomeMonitorTracker implements GnomeMonitorIndex {
    readonly #logger: LoggerPort;
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #identityStore: MonitorIdentityStore;
    readonly #monitorQuery: GnomeMonitorQuery;
    readonly #knownMonitorIds: Set<string>;
    readonly #indexById: Map<string, number>;

    constructor(deps: GnomeMonitorTrackerDeps) {
        this.#logger = deps.logger;
        this.#eventEmitter = deps.eventEmitter;
        this.#identityStore = deps.identityStore;
        this.#monitorQuery = deps.monitorQuery;
        this.#knownMonitorIds = new Set();
        this.#indexById = new Map();
    }

    start(): void {
        Main.layoutManager.connectObject(
            'monitors-changed',
            this.#onMonitorsChanged.bind(this),
            this,
        );

        const currentMonitors =
            this.#monitorQuery.listCurrentMonitorIdentities();
        this.#rebuildIndexById(currentMonitors);

        for (const monitor of currentMonitors) {
            this.#knownMonitorIds.add(monitor.monitorId);
        }
    }

    emitInitialState(): void {
        const persistedMonitorIds = this.#identityStore.listIds();
        for (const monitorId of persistedMonitorIds) {
            if (!this.#knownMonitorIds.has(monitorId)) {
                this.#emitMonitorDisconnected(monitorId);
            }
        }

        const currentMonitors =
            this.#monitorQuery.listCurrentMonitorIdentities();
        for (const monitor of currentMonitors) {
            this.#emitMonitorConnected(monitor);
        }
    }

    #rebuildIndexById(monitors: readonly LogicalMonitorIdentity[]): void {
        this.#indexById.clear();
        for (const monitor of monitors) {
            this.#indexById.set(monitor.monitorId, monitor.index);
            this.#logger.info(
                `monitor ${monitor.monitorId} now has index ${monitor.index}`,
            );
        }
        this.#logger.info(`monitor index map rebuilt`);
    }

    stop(): void {
        try {
            Main.layoutManager.disconnectObject(this);
        } catch {
            this.#logger.warn('failed to disconnect monitors-changed signal');
        }

        this.#knownMonitorIds.clear();
        this.#indexById.clear();
    }

    #onMonitorsChanged(): void {
        try {
            const currentMonitors =
                this.#monitorQuery.listCurrentMonitorIdentities();
            const currentMonitorIds = new Set(
                currentMonitors.map((m) => m.monitorId),
            );

            this.#rebuildIndexById(currentMonitors);
            this.#processNewAndChangedMonitors(currentMonitors);
            this.#processDisconnectedMonitors(currentMonitorIds);
            this.#eventEmitter.emit({
                type: 'monitors-geometry-changed',
                payload: {},
            });
        } catch (error) {
            this.#logger.error(`error in #onMonitorsChanged: ${String(error)}`);
        }
    }

    #processNewAndChangedMonitors(
        currentMonitors: LogicalMonitorIdentity[],
    ): void {
        for (const monitor of currentMonitors) {
            this.#handleNewMonitor(monitor);
        }
    }

    #emitMonitorConnected(monitor: LogicalMonitorIdentity): void {
        this.#eventEmitter.emit({
            type: 'monitor-connected',
            payload: {
                monitorId: monitor.monitorId,
                physicalMonitors: monitor.physicalMonitors,
            },
        });
    }

    #emitMonitorDisconnected(monitorId: string): void {
        this.#eventEmitter.emit({
            type: 'monitor-disconnected',
            payload: { monitorId },
        });
    }

    #handleNewMonitor(monitor: LogicalMonitorIdentity): void {
        if (this.#knownMonitorIds.has(monitor.monitorId)) {
            return;
        }

        this.#knownMonitorIds.add(monitor.monitorId);
        this.#emitMonitorConnected(monitor);
    }

    #processDisconnectedMonitors(currentIds: ReadonlySet<string>): void {
        const toRemove: string[] = [];
        for (const knownId of this.#knownMonitorIds) {
            if (!currentIds.has(knownId)) {
                toRemove.push(knownId);
            }
        }
        for (const knownId of toRemove) {
            this.#knownMonitorIds.delete(knownId);
            this.#eventEmitter.emit({
                type: 'monitor-disconnected',
                payload: { monitorId: knownId },
            });
        }
    }

    getMonitorIdByIndex(index: number): string {
        const monitorId = this.tryGetMonitorIdByIndex(index);
        if (monitorId === undefined) {
            throw new Error(
                `monitorId lookup failed for index (index=${index})`,
            );
        }
        return monitorId;
    }

    tryGetMonitorIdByIndex(index: number): string | undefined {
        for (const [monitorId, monitorIndex] of this.#indexById.entries()) {
            if (monitorIndex === index) {
                return monitorId;
            }
        }
        return undefined;
    }

    getIndexByMonitorId(id: string): number {
        const index = this.tryGetIndexByMonitorId(id);
        if (index === undefined) {
            throw new Error(
                `monitor index lookup failed for monitorId (monitorId=${id})`,
            );
        }
        return index;
    }

    tryGetIndexByMonitorId(id: string): number | undefined {
        return this.#indexById.get(id);
    }
}
