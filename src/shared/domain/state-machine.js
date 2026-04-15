export const State = Object.freeze({
    Disabled: 'Disabled',
    AutoAwake: 'AutoAwake',
    AutoBlack: 'AutoBlack',
    KeepAwake: 'KeepAwake',
    ManualBlack: 'ManualBlack',
});

class SignalEmitter {
    #listeners = new Map();

    on(signal, handler) {
        if (!this.#listeners.has(signal)) this.#listeners.set(signal, new Set());
        this.#listeners.get(signal).add(handler);
        return () => this.off(signal, handler);
    }

    off(signal, handler) {
        this.#listeners.get(signal)?.delete(handler);
    }

    emit(signal, payload) {
        for (const handler of this.#listeners.get(signal) ?? []) handler(payload);
    }
}

export class StateMachine extends SignalEmitter {
    constructor(initialState = State.Disabled) {
        super();
        this.state = initialState;
        this.keepAwakeUntil = undefined;
    }

    transition(nextState, reason) {
        if (this.state === nextState) return false;
        const previous = this.state;
        this.state = nextState;
        this.emit('state-changed', { previous, current: nextState, reason });
        return true;
    }

    setKeepAwake(durationMs, now = Date.now()) {
        this.keepAwakeUntil = now + Math.max(0, durationMs);
        return this.transition(State.KeepAwake, 'keep-awake');
    }
}
