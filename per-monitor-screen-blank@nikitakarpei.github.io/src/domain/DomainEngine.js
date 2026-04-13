import { State } from './StateMachine.js';
import { resolveSettingsModeEffect } from '../core/modeLogic.js';
import { shouldAutoBlack } from '../core/autoBlackPolicy.js';

export function resolveModeSync(snapshot, previous) {
    return resolveSettingsModeEffect(
        snapshot.mode,
        snapshot.keepAwakeMinutes,
        previous.lastMode,
        previous.lastKeepAwakeMinutes
    );
}

export function resolveAutoState(snapshot, runtime) {
    const shouldBlack = shouldAutoBlack({
        targetIdleTimeMs: runtime.targetIdleTimeMs,
        idleTimeoutSeconds: snapshot.idleTimeoutSeconds,
        wakeOnPointerEntry: snapshot.wakeOnPointerEntry,
        isCurrentlyAutoBlack: runtime.currentState === State.AutoBlack,
        isPointerOnTargetMonitor: runtime.isPointerOnTargetMonitor,
    });
    return shouldBlack ? State.AutoBlack : State.AutoAwake;
}
