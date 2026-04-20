import { EventBus } from '../../domain/event-bus.js';
import type { LoggerPort } from '../../util/logger.js';
import type { MonitorState } from '../../domain/monitor-state.js';
import type { PlatformEvent, PlatformEventBus } from '../../ports/index.js';

export type StateChangedEvent = {
    type: 'state-changed';
    payload: {
        monitorId: string;
        previous: MonitorState | undefined;
        current: MonitorState;
        reason: string;
    };
};

// eslint-disable-next-line sonarjs/redundant-type-aliases
type AppEvents = StateChangedEvent;

export class AppEventBus {
    readonly #bus: EventBus<PlatformEvent | AppEvents>;
    #platformUnsub: (() => void) | undefined;

    constructor(platformBus: PlatformEventBus, logger: LoggerPort) {
        this.#bus = new EventBus<PlatformEvent | AppEvents>(logger);
        this.#platformUnsub = platformBus.onAny((event) => {
            this.#bus.emit(event);
        });
    }

    on<K extends (PlatformEvent | AppEvents)['type']>(
        eventType: K,
        callback: (
            payload: Extract<PlatformEvent | AppEvents, { type: K }>['payload'],
        ) => void,
    ): () => void {
        return this.#bus.on(eventType, callback as (payload: object) => void);
    }

    onAny(callback: (event: PlatformEvent | AppEvents) => void): () => void {
        return this.#bus.onAny(callback);
    }

    emit(event: AppEvents): void {
        // Architecture enforcement: app layer can only emit AppEvents, not PlatformEvent
        this.#bus.emit(event);
    }

    destroy(): void {
        this.#platformUnsub?.();
        this.#platformUnsub = undefined;
        this.#bus.destroy();
    }
}
