import { EventBus } from '../../util/event-bus.js';
import {
    PlatformEventSubscriber,
    PlatformEvent,
    PlatformEventEmitter,
} from '../../app/ports/platform-events.js';
import { LoggerPort } from '../../util/logger.js';

export class GnomePlatformEventBus
    implements PlatformEventSubscriber, PlatformEventEmitter
{
    readonly #bus: EventBus<PlatformEvent>;

    constructor(logger: LoggerPort) {
        this.#bus = new EventBus<PlatformEvent>(logger);
    }

    on: PlatformEventSubscriber['on'] = (eventType, callback) => {
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
