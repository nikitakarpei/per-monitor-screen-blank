import { SettingsGateway } from '../../app/ports/settings.js';
import { FocusedMonitorService } from './focused-monitor-service.js';
import {
    modeToInitialState,
    MonitorState,
} from '../../domain/monitor-state.js';
import { MonitorMode } from '../../domain/monitor-mode.js';

interface ModeStateResolverDeps {
    gateway: SettingsGateway;
    focusedMonitorService: FocusedMonitorService;
}

export class ModeStateResolver {
    private readonly gateway: SettingsGateway;
    private readonly focusedMonitorService: FocusedMonitorService;

    constructor(deps: ModeStateResolverDeps) {
        this.gateway = deps.gateway;
        this.focusedMonitorService = deps.focusedMonitorService;
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
