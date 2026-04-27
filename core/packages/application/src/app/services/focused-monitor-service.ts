import { MonitorEntity } from '@pmsb/domain';
import { PointerSource } from '../../app/ports/monitors.js';
import { MonitorRegistry } from './monitor-registry.js';

interface FocusedMonitorServiceDeps {
    pointerSource: PointerSource;
    monitorRegistry: MonitorRegistry;
}

export class FocusedMonitorService {
    private readonly pointerSource: PointerSource;
    private readonly monitorRegistry: MonitorRegistry;

    constructor(deps: FocusedMonitorServiceDeps) {
        this.pointerSource = deps.pointerSource;
        this.monitorRegistry = deps.monitorRegistry;
    }

    getFocusedMonitor(): Readonly<MonitorEntity> | undefined {
        const snapshot = this.pointerSource.getPointerPosition();
        return this.monitorRegistry.tryGet(snapshot.monitorId);
    }
}
