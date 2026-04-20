import type { MonitorEntity } from '../../domain/monitor-entity.js';
import type { PointerSource } from '../../ports/index.js';
import type { MonitorRegistry } from './monitor-registry.js';

interface FocusedMonitorServiceOptions {
    pointerSource: PointerSource;
    monitorRegistry: MonitorRegistry;
}

export class FocusedMonitorService {
    private readonly pointerSource: PointerSource;
    private readonly monitorRegistry: MonitorRegistry;

    constructor(options: FocusedMonitorServiceOptions) {
        this.pointerSource = options.pointerSource;
        this.monitorRegistry = options.monitorRegistry;
    }

    getFocusedMonitor(): Readonly<MonitorEntity> | undefined {
        const snapshot = this.pointerSource.getPointerPosition();
        return this.monitorRegistry.tryGet(snapshot.monitorId);
    }
}
