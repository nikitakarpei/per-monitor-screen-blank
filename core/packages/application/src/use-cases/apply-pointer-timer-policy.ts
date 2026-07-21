import { isAutoMonitorState, resolveAutoMonitorState } from '@pmsb/domain';
import type { LoggerPort } from '../util/logger.js';
import type { MonitorRegistry } from '../services/monitor-registry.js';
import type { FocusedMonitorService } from '../services/focused-monitor-service.js';

export interface ApplyPointerTimerPolicyDeps {
    readonly focusedMonitorService: FocusedMonitorService;
    readonly monitorRegistry: MonitorRegistry;
    readonly logger: LoggerPort;
}

export function applyPointerTimerPolicy(
    deps: ApplyPointerTimerPolicyDeps,
    autoBlackWhenFocused: boolean,
): void {
    const focused = deps.focusedMonitorService.getFocusedMonitor();
    if (!focused) {
        deps.logger.warn('no focused monitor found');
        return;
    }
    if (!focused.state || !isAutoMonitorState(focused.state)) return;

    const targetState = resolveAutoMonitorState(autoBlackWhenFocused, true);

    if (focused.state !== targetState) {
        void deps.monitorRegistry.transitionState(
            focused.id,
            targetState,
            'pointer-monitor-timer-policy-changed',
        );
    }
}
