export const State = Object.freeze({
    Disabled: 'Disabled',
    AutoAwake: 'AutoAwake',
    AutoBlack: 'AutoBlack',
    KeepAwake: 'KeepAwake',
    ManualBlack: 'ManualBlack',
});

export class SignalEmitter {
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
        this.keepAwakeUntil = null;
    }

    transition(nextState, reason = null) {
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

    clearKeepAwake(reason = 'expired') {
        if (this.keepAwakeUntil === null) return false;
        this.keepAwakeUntil = null;
        return this.transition(State.AutoAwake, reason);
    }

    update(now = Date.now()) {
        if (this.state === State.KeepAwake && this.keepAwakeUntil !== null && now >= this.keepAwakeUntil) {
            const expiredAt = this.keepAwakeUntil;
            this.keepAwakeUntil = null;
            this.transition(State.AutoAwake, 'keep-awake-expired');
            this.emit('keep-awake-expired', { expiredAt });
            return true;
        }
        return false;
    }
}
