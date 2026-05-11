import type { Disposable } from '@pmsb/lifecycle';
import { EventBus } from '../../util/event-bus.js';
import type { LoggerPort } from '../../util/logger.js';
import type { AppEvents } from '../app-events.js';
import type {
    PlatformEventSubscriber,
    PlatformEvent,
} from '../../app/ports/platform-events.js';

export class AppEventBus implements Disposable {
    readonly #bus: EventBus<PlatformEvent | AppEvents>;
    #platformUnsub: (() => void) | undefined;
    #disposed = false;

    constructor(logger: LoggerPort, platformBus: PlatformEventSubscriber) {
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

    dispose(): void {
        if (this.#disposed) {
            return;
        }
        this.#disposed = true;
        this.#platformUnsub?.();
        this.#platformUnsub = undefined;
        this.#bus.dispose();
    }
}
