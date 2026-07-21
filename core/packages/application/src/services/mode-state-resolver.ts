import type { GeneralSettings } from '../ports/general-settings.js';
import type { FocusedMonitorService } from './focused-monitor-service.js';
import { modeToInitialState } from '@pmsb/domain';
import type { MonitorState, MonitorMode } from '@pmsb/domain';

export class ModeStateResolver {
    readonly #generalSettings: GeneralSettings;
    readonly #focusedMonitorService: FocusedMonitorService;

    constructor(
        generalSettings: GeneralSettings,
        focusedMonitorService: FocusedMonitorService,
    ) {
        this.#generalSettings = generalSettings;
        this.#focusedMonitorService = focusedMonitorService;
    }

    initialStateForMode(mode: MonitorMode, monitorId: string): MonitorState {
        const isFocused =
            this.#focusedMonitorService.getFocusedMonitor()?.id === monitorId;
        const shouldAutoBlackWhenFocused =
            !this.#generalSettings.getDisableAutoTimerOnPointerMonitor();
        return modeToInitialState(mode, shouldAutoBlackWhenFocused, isFocused);
    }
}
