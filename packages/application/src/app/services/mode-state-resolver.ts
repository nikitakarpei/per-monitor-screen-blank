import { SettingsGateway } from '../../app/ports/settings.js';
import { FocusedMonitorService } from './focused-monitor-service.js';
import {
    modeToInitialState,
    type MonitorState,
    type MonitorMode,
} from '@pmsb/core';

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
