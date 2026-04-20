import type { SettingsGateway } from '../../ports/index.js';
import type { FocusedMonitorService } from './focused-monitor-service.js';
import { modeToInitialState } from '../../domain/monitor-state.js';
import type { MonitorMode } from '../../domain/monitor-mode.js';
import type { MonitorState } from '../../domain/monitor-state.js';

interface ModeStateResolverOptions {
    gateway: SettingsGateway;
    focusedMonitorService: FocusedMonitorService;
}

export class ModeStateResolver {
    private readonly gateway: SettingsGateway;
    private readonly focusedMonitorService: FocusedMonitorService;

    constructor(options: ModeStateResolverOptions) {
        this.gateway = options.gateway;
        this.focusedMonitorService = options.focusedMonitorService;
    }

    initialStateForMode(mode: MonitorMode, monitorId: string): MonitorState {
        const isFocused =
            this.focusedMonitorService.getFocusedMonitor()?.id === monitorId;
        return modeToInitialState(
            mode,
            this.gateway.shouldMonitorAutoBlackWhenFocused(),
            isFocused,
        );
    }
}
