import { MonitorRegistry } from '../../services/monitor-registry.js';
import { PointerMonitorTimerPolicyChangedEvent } from '../../../app/ports/platform-events.js';
import { FocusedMonitorService } from '../../services/focused-monitor-service.js';
import {
    isAutoMonitorState,
    resolveAutoMonitorState,
} from '../../../domain/monitor-state.js';
import { LoggerPort } from '../../../util/logger.js';

interface TransitionFocusedMonitorStateDeps {
    focusedMonitorService: FocusedMonitorService;
    monitorRegistry: MonitorRegistry;
    logger: LoggerPort;
}

/**
 * Handles the 'pointer-monitor-timer-policy-changed' event by transitioning the focused monitor to AutoPaused or AutoAwake state.
 */
export function transitionFocusedMonitorState(
    deps: TransitionFocusedMonitorStateDeps,
    payload: PointerMonitorTimerPolicyChangedEvent['payload'],
): void {
    const focused = deps.focusedMonitorService.getFocusedMonitor();
    if (!focused) {
        deps.logger.warn('no focused monitor found');
        return;
    }
    if (!focused.state || !isAutoMonitorState(focused.state)) return;

    // Compute the target state based on policy - always focused=true since this handler only affects the focused monitor
    const targetState = resolveAutoMonitorState(
        payload.shouldMonitorAutoBlackWhenFocused,
        true,
    );

    // Only transition if the current state differs from the target state
    if (focused.state !== targetState) {
        void deps.monitorRegistry.transitionState(
            focused.id,
            targetState,
            'pointer-monitor-timer-policy-changed',
        );
    }
}
