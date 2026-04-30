import {
    type Disposable,
    type DisposableStore,
    createDisposableStore,
} from '@pmsb/lifecycle';
import { type LoggerPort, type PlatformEventEmitter } from '@pmsb/application';
import { type GnomeMonitorIdentityStore } from './shared/monitor-identity-store.js';

export class GnomeMonitorIdentityWatcher implements Disposable {
    readonly #identityStore: GnomeMonitorIdentityStore;
    readonly #eventEmitter: PlatformEventEmitter;

    readonly #observationStore: DisposableStore;
    #destroyed = false;

    constructor(
        identityStore: GnomeMonitorIdentityStore,
        eventEmitter: PlatformEventEmitter,
        logger: LoggerPort,
    ) {
        this.#identityStore = identityStore;
        this.#eventEmitter = eventEmitter;
        this.#observationStore = createDisposableStore((error) => {
            logger.error(
                `Failed to dispose resource in GnomeMonitorIdentityWatcher observation store: ${String(error)}`,
            );
        });

        void this.#observationStore.add(
            this.#identityStore.observeKnownMonitorsChanged(() => {
                this.#eventEmitter.emit({
                    type: 'known-monitors-changed',
                    payload: {},
                });
            }),
        );
    }

    dispose(): void {
        if (this.#destroyed) {
            return;
        }

        this.#destroyed = true;
        this.#observationStore.dispose();
    }
}
