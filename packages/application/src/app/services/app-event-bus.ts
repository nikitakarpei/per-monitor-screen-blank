import { EventBus } from '../../util/event-bus.js';
import { LoggerPort } from '../../util/logger.js';
import { AppEvents } from '../app-events.js';
import {
    PlatformEventSubscriber,
    PlatformEvent,
} from '../../app/ports/platform-events.js';

interface AppEventBusDeps {
    platformBus: PlatformEventSubscriber;
    logger: LoggerPort;
}

export class AppEventBus {
    readonly #bus: EventBus<PlatformEvent | AppEvents>;
    #platformUnsub: (() => void) | undefined;

    constructor(deps: AppEventBusDeps) {
        this.#bus = new EventBus<PlatformEvent | AppEvents>(deps.logger);
        this.#platformUnsub = deps.platformBus.onAny((event) => {
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
