import type { MonitorMode } from './monitor-mode.js';

export type MonitorState =
    | 'Disabled'
    | 'AutoAwake'
    | 'AutoPaused'
    | 'AutoBlack'
    | 'KeepAwake'
    | 'ManualBlack';

type TransitionResult =
    | {
          previous: MonitorState | undefined;
          current: MonitorState;
      }
    | undefined;

/**
 * Pure transition function. Returns transition result if state changed, null otherwise.
 */
export function tryTransition(
    current: MonitorState | undefined,
    next: MonitorState,
): TransitionResult {
    if (current === next) {
        return undefined;
    }
    return { previous: current, current: next };
}

export function modeToInitialState(
    mode: MonitorMode,
    autoBlackWhenFocused: boolean,
    isFocused: boolean,
): MonitorState {
    switch (mode) {
        case 'auto': {
            return resolveAutoMonitorState(autoBlackWhenFocused, isFocused);
        }
        case 'keep-awake': {
            return 'KeepAwake';
        }
        case 'disabled': {
            return 'Disabled';
        }
        case 'manual-black': {
            return 'ManualBlack';
        }
        default: {
            throw new Error(`Invalid mode: ${mode}`);
        }
    }
}

/*
 * Resolve the auto monitor state based on focus and policy.
 */
export function resolveAutoMonitorState(
    autoBlackWhenFocused: boolean,
    isFocused: boolean,
): MonitorState {
    return isFocused && !autoBlackWhenFocused ? 'AutoPaused' : 'AutoAwake';
}

/*
 * Check if the monitor state is in one of the auto states.
 */
export function isAutoMonitorState(state: MonitorState): boolean {
    return ['AutoAwake', 'AutoPaused', 'AutoBlack'].includes(state);
}
