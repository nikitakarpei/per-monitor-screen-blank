import type { Disposable } from '@pmsb/lifecycle';
import { EventBus } from '@pmsb/application';
import type {
    PlatformEventSubscriber,
    PlatformEvent,
    PlatformEventEmitter,
    LoggerPort,
} from '@pmsb/application';

export class GnomePlatformEventBus
    implements PlatformEventSubscriber, PlatformEventEmitter, Disposable
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

    dispose(): void {
        this.#bus.dispose();
    }
}
