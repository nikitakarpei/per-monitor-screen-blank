import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { type Disposable } from '@pmsb/lifecycle';
import { GnomeMonitorQuery } from './gnome-monitor-query.js';
import { type LoggerPort, type PlatformEventEmitter } from '@pmsb/application';
import { GnomeMonitorIndex } from './gnome-monitor-index.js';
import { type LogicalMonitorIdentity } from '@pmsb/domain';

export class GnomeMonitorTracker implements GnomeMonitorIndex, Disposable {
    readonly #logger: LoggerPort;
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #monitorQuery: GnomeMonitorQuery;
    readonly #knownMonitorIds = new Set<string>();
    readonly #indexById = new Map<string, number>();

    constructor(
        logger: LoggerPort,
        eventEmitter: PlatformEventEmitter,
        monitorQuery: GnomeMonitorQuery,
    ) {
        this.#logger = logger;
        this.#eventEmitter = eventEmitter;
        this.#monitorQuery = monitorQuery;

        const currentMonitors = this.#monitorQuery.listConnectedMonitors();
        this.#rebuildIndexById(currentMonitors);

        for (const monitor of currentMonitors) {
            this.#knownMonitorIds.add(monitor.monitorId);
        }

        Main.layoutManager.connectObject(
            'monitors-changed',
            () => {
                try {
                    this.#onMonitorsChanged();
                } catch (error) {
                    this.#logger.error(`error in #onMonitorsChanged`, error);
                }
            },
            this,
        );
    }

    #rebuildIndexById(monitors: readonly LogicalMonitorIdentity[]): void {
        this.#indexById.clear();
        for (const monitor of monitors) {
            this.#indexById.set(monitor.monitorId, monitor.index);
        }
    }

    dispose(): void {
        Main.layoutManager.disconnectObject(this);

        this.#knownMonitorIds.clear();
        this.#indexById.clear();
    }

    #onMonitorsChanged(): void {
        const currentMonitors = this.#monitorQuery.listConnectedMonitors();
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
    }

    #processNewAndChangedMonitors(
        currentMonitors: readonly LogicalMonitorIdentity[],
    ): void {
        for (const monitor of currentMonitors) {
            this.#handleNewMonitor(monitor);
        }
    }

    #emitMonitorConnected(monitor: LogicalMonitorIdentity): void {
        this.#eventEmitter.emit({
            type: 'monitor-connected',
            payload: monitor,
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
