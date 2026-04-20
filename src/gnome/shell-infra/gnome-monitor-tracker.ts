import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { listCurrentMonitorIdentities } from './mutter-display-config.js';
import type { LoggerPort } from '../../util/logger.js';
import {
    gobjectConnectObject,
    gobjectDisconnectObject,
} from '../shared/gobject-helpers.js';
import type { PlatformEventEmitter } from '../../ports/index.js';
import type { MonitorIdentity } from '../../domain/ports-domain.js';

interface GnomeMonitorTrackerOptions {
    readonly logger: LoggerPort;
    readonly eventEmitter: PlatformEventEmitter;
}

export interface MonitorIndexResolver {
    getMonitorIdByIndex(index: number): string;
    tryGetMonitorIdByIndex(index: number): string | undefined;
    getIndexByMonitorId(id: string): number;
    tryGetIndexByMonitorId(id: string): number | undefined;
}

export class GnomeMonitorTracker implements MonitorIndexResolver {
    readonly #logger: LoggerPort;
    readonly #eventEmitter: PlatformEventEmitter;
    readonly #knownMonitorIds: Set<string>;
    readonly #indexById: Map<string, number>;

    constructor(options: GnomeMonitorTrackerOptions) {
        this.#logger = options.logger;
        this.#eventEmitter = options.eventEmitter;
        this.#knownMonitorIds = new Set();
        this.#indexById = new Map();
    }

    start(): void {
        gobjectConnectObject(
            Main.layoutManager,
            'monitors-changed',
            this.#onMonitorsChanged.bind(this),
            this,
        );

        const currentMonitors = listCurrentMonitorIdentities(this.#logger);
        this.#rebuildIndexById(currentMonitors);

        for (const monitor of currentMonitors) {
            this.#knownMonitorIds.add(monitor.monitorId);
        }
    }

    emitInitialState(): void {
        const currentMonitors = listCurrentMonitorIdentities(this.#logger);

        for (const monitor of currentMonitors) {
            this.#eventEmitter.emit({
                type: 'monitor-connected',
                payload: this.#buildConnectedPayload(monitor),
            });
        }
    }

    #rebuildIndexById(identities: readonly MonitorIdentity[]): void {
        this.#indexById.clear();
        for (const identity of identities) {
            this.#indexById.set(identity.monitorId, identity.index);
            this.#logger.info(
                `monitor ${identity.monitorId} now has index ${identity.index}`,
            );
        }
        this.#logger.info(`monitor index map rebuilt`);
    }

    stop(): void {
        try {
            gobjectDisconnectObject(Main.layoutManager, this);
        } catch {
            this.#logger.warn('failed to disconnect monitors-changed signal');
        }

        this.#knownMonitorIds.clear();
        this.#indexById.clear();
    }

    #onMonitorsChanged(): void {
        try {
            const currentMonitors = listCurrentMonitorIdentities(this.#logger);
            const currentIds = new Set(currentMonitors.map((m) => m.monitorId));

            this.#rebuildIndexById(currentMonitors);
            this.#processNewAndChangedMonitors(currentMonitors);
            this.#processDisconnectedMonitors(currentIds);
            this.#eventEmitter.emit({
                type: 'monitors-geometry-changed',
                payload: {},
            });
        } catch (error) {
            this.#logger.error(`error in #onMonitorsChanged: ${String(error)}`);
        }
    }

    #processNewAndChangedMonitors(
        currentMonitors: readonly MonitorIdentity[],
    ): void {
        for (const monitor of currentMonitors) {
            this.#handleNewMonitor(monitor);
        }
    }

    #buildConnectedPayload(monitor: MonitorIdentity) {
        return {
            monitorId: monitor.monitorId,
            connector: monitor.connector,
            vendor: monitor.vendor,
            product: monitor.product,
        };
    }

    #handleNewMonitor(monitor: MonitorIdentity): void {
        if (this.#knownMonitorIds.has(monitor.monitorId)) {
            return;
        }

        this.#knownMonitorIds.add(monitor.monitorId);
        this.#eventEmitter.emit({
            type: 'monitor-connected',
            payload: this.#buildConnectedPayload(monitor),
        });
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
