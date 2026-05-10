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

        this.#indexById.clear();
    }

    #onMonitorsChanged(): void {
        const currentMonitors = new Map(
            this.#monitorQuery
                .listConnectedMonitors()
                .map((m) => [m.monitorId, m]),
        );

        const disconnectedMonitorIds: string[] = [];
        const connectedMonitors: LogicalMonitorIdentity[] = [];

        for (const [monitorId, monitorIndex] of this.#indexById) {
            const monitor = currentMonitors.get(monitorId);

            if (!monitor || monitor.index !== monitorIndex) {
                this.#indexById.delete(monitorId);
                disconnectedMonitorIds.push(monitorId);
            }
        }

        for (const monitorId of disconnectedMonitorIds) {
            this.#eventEmitter.emit({
                type: 'monitor-disconnected',
                payload: { monitorId },
            });
        }

        for (const [monitorId, monitor] of currentMonitors) {
            if (!this.#indexById.has(monitorId)) {
                this.#indexById.set(monitorId, monitor.index);
                connectedMonitors.push(monitor);
            }
        }

        for (const monitor of connectedMonitors) {
            this.#eventEmitter.emit({
                type: 'monitor-connected',
                payload: monitor,
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
