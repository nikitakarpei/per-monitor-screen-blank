import type { MonitorEntity } from '@pmsb/domain';
import type { PointerSource } from '../ports/monitors.js';
import type { MonitorRegistry } from './monitor-registry.js';

export class FocusedMonitorService {
    readonly #pointerSource: PointerSource;
    readonly #monitorRegistry: MonitorRegistry;

    constructor(
        pointerSource: PointerSource,
        monitorRegistry: MonitorRegistry,
    ) {
        this.#pointerSource = pointerSource;
        this.#monitorRegistry = monitorRegistry;
    }

    getFocusedMonitor(): Readonly<MonitorEntity> | undefined {
        const snapshot = this.#pointerSource.getPointerPosition();
        return this.#monitorRegistry.tryGet(snapshot.monitorId);
    }
}
