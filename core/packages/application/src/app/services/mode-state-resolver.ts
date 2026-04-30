import { type GeneralSettings } from '../../app/ports/general-settings.js';
import { FocusedMonitorService } from './focused-monitor-service.js';
import {
    modeToInitialState,
    type MonitorState,
    type MonitorMode,
} from '@pmsb/domain';

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
