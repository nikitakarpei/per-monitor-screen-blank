import { State } from '../domain/state-machine.js';
import { DEFAULTS } from './defaults.js';

export function normalizeKeepAwakeMinutes(minutes, fallback = DEFAULTS.keepAwakeMinutes) {
    return Math.max(1, Number.isFinite(minutes) ? minutes : fallback);
}

export function shouldRearmKeepAwake(mode, keepAwakeMinutes, lastMode, lastKeepAwakeMinutes) {
    return mode === 'keep-awake' && (mode !== lastMode || keepAwakeMinutes !== lastKeepAwakeMinutes);
}

export function resolveSettingsModeEffect(mode, keepAwakeMinutes, lastMode, lastKeepAwakeMinutes) {
    if (mode === 'disabled')
        {return { transitionState: State.Disabled, keepAwakeMs: undefined };}

    if (shouldRearmKeepAwake(mode, keepAwakeMinutes, lastMode, lastKeepAwakeMinutes))
        {return { transitionState: undefined, keepAwakeMs: keepAwakeMinutes * 60 * 1000 };}

    if (mode === 'manual-black')
        {return { transitionState: State.ManualBlack, keepAwakeMs: undefined };}

    return { transitionState: undefined, keepAwakeMs: undefined };
}
