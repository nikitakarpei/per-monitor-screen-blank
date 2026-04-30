import { LoggerPort } from './logger.js';

type EventListener<TPayload extends object> = (payload: TPayload) => void;

export class EventBus<TEvent extends { type: string; payload: object }> {
    #listeners = new Map<string, Set<EventListener<object>>>();
    #anyListeners = new Set<(event: TEvent) => void>();
    readonly #logger: LoggerPort;

    constructor(logger: LoggerPort) {
        this.#logger = logger;
    }

    on<K extends TEvent['type']>(
        signal: K,
        callback: EventListener<Extract<TEvent, { type: K }>['payload']>,
    ): () => void {
        const signalSet = this.#listeners.get(signal) ?? new Set();
        this.#listeners.set(signal, signalSet);
        signalSet.add(callback as EventListener<object>);
        return () => this.off(signal, callback);
    }

    onAny(callback: (event: TEvent) => void): () => void {
        this.#anyListeners.add(callback);
        return () => {
            this.#anyListeners.delete(callback);
            this.#logger.info('onAny listener unsubscribed');
        };
    }

    off<K extends TEvent['type']>(
        signal: K,
        callback: EventListener<Extract<TEvent, { type: K }>['payload']>,
    ): void {
        this.#listeners.get(signal)?.delete(callback as EventListener<object>);
    }

    emit(event: TEvent): void {
        const listeners = this.#listeners.get(event.type);

        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(event.payload);
                } catch (error) {
                    this.#logger.error(
                        `error in listener for event "${event.type}": ${String(error)}`,
                    );
                }
            }
        }

        for (const anyListener of this.#anyListeners) {
            try {
                anyListener(event);
            } catch (error) {
                this.#logger.error(
                    `error in onAny listener for event "${event.type}": ${String(error)}`,
                );
            }
        }
    }

    dispose(): void {
        for (const listeners of this.#listeners.values()) {
            listeners.clear();
        }
        this.#listeners.clear();
        this.#anyListeners.clear();
    }
}
