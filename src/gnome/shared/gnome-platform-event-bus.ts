import { EventBus } from '../../domain/event-bus.js';
import type { PlatformEventBus, PlatformEvent } from '../../ports/index.js';
import type { LoggerPort } from '../../util/logger.js';

export class GnomePlatformEventBus implements PlatformEventBus {
    readonly #bus: EventBus<PlatformEvent>;

    constructor(logger: LoggerPort) {
        this.#bus = new EventBus<PlatformEvent>(logger);
    }

    on: PlatformEventBus['on'] = (eventType, callback) => {
        return this.#bus.on(eventType, callback as (payload: object) => void);
    };

    emit(event: PlatformEvent): void {
        this.#bus.emit(event);
    }

    onAny(callback: (event: PlatformEvent) => void): () => void {
        return this.#bus.onAny(callback);
    }

    destroy(): void {
        this.#bus.destroy();
    }
}
