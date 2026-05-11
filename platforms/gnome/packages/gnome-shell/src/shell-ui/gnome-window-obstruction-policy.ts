import type { LoggerPort, PlatformEventSubscriber } from '@pmsb/application';
import type { Disposable } from '@pmsb/lifecycle';
import type Meta from 'gi://Meta';

interface WindowObstructionPolicyConfig {
    getDisableWindowObstructionPolicy(): boolean;
}

export class GnomeWindowObstructionPolicy implements Disposable {
    readonly #logger: LoggerPort;
    readonly #eventBus: PlatformEventSubscriber;
    readonly #config: WindowObstructionPolicyConfig;
    readonly #trackedOverlays = new Map<string, number>();
    #unredirectDisabled = false;
    #windowSignals: Map<Meta.Window, number> = new Map();
    #displaySignalIds: number[] = [];
    #unsubscribeOverlayShown?: () => void;
    #unsubscribeOverlayHidden?: () => void;
    #unsubscribePolicyChanged?: () => void;

    constructor(
        eventBus: PlatformEventSubscriber,
        logger: LoggerPort,
        config: WindowObstructionPolicyConfig,
    ) {
        this.#eventBus = eventBus;
        this.#logger = logger;
        this.#config = config;

        this.#unsubscribeOverlayShown = this.#eventBus.on(
            'overlay-shown',
            ({ monitorId, monitorIndex }) => {
                this.#trackedOverlays.set(monitorId, monitorIndex);
                this.#updateUnredirectState();
            },
        );

        this.#unsubscribeOverlayHidden = this.#eventBus.on(
            'overlay-hidden',
            ({ monitorId }) => {
                this.#trackedOverlays.delete(monitorId);
                this.#updateUnredirectState();
            },
        );

        this.#unsubscribePolicyChanged = this.#eventBus.on(
            'window-obstruction-policy-changed',
            () => {
                this.#updateUnredirectState();
            },
        );

        this.#displaySignalIds.push(
            global.display.connect('in-fullscreen-changed', () => {
                this.#updateUnredirectState();
            }),
            global.display.connect('window-entered-monitor', () => {
                this.#updateUnredirectState();
            }),
            global.display.connect('window-left-monitor', () => {
                this.#updateUnredirectState();
            }),
            global.display.connect('window-created', (_display, window) => {
                this.#connectWindow(window);
                this.#updateUnredirectState();
            }),
        );

        // Connect to existing windows
        for (const actor of global.get_window_actors()) {
            this.#connectWindow(actor.metaWindow);
        }
    }

    dispose(): void {
        for (const signalId of this.#displaySignalIds) {
            global.display.disconnect(signalId);
        }
        this.#displaySignalIds = [];

        for (const [window, signalId] of this.#windowSignals) {
            window.disconnect(signalId);
        }
        this.#windowSignals.clear();

        if (this.#unredirectDisabled) {
            global.compositor.enable_unredirect();
            this.#unredirectDisabled = false;
        }

        this.#unsubscribeOverlayShown?.();
        this.#unsubscribeOverlayShown = undefined;

        this.#unsubscribeOverlayHidden?.();
        this.#unsubscribeOverlayHidden = undefined;

        this.#unsubscribePolicyChanged?.();
        this.#unsubscribePolicyChanged = undefined;

        this.#trackedOverlays.clear();
    }

    #connectWindow(window: Meta.Window): void {
        if (this.#windowSignals.has(window)) {
            return;
        }

        const maximizedId = window.connect('notify::maximized', () => {
            this.#updateUnredirectState();
        });

        const unmanagedId = window.connect('unmanaged', () => {
            window.disconnect(maximizedId);
            this.#windowSignals.delete(window);
            this.#updateUnredirectState();
        });

        this.#windowSignals.set(window, unmanagedId);
    }

    #updateUnredirectState(): void {
        const shouldDisable =
            !this.#config.getDisableWindowObstructionPolicy() &&
            this.#hasTrackedMonitorWithObstructingWindow();

        if (shouldDisable && !this.#unredirectDisabled) {
            this.#logger.info('Disabling unredirection in compositor');
            global.compositor.disable_unredirect();
            this.#unredirectDisabled = true;
        } else if (!shouldDisable && this.#unredirectDisabled) {
            this.#logger.info('Enabling unredirection in compositor');
            global.compositor.enable_unredirect();
            this.#unredirectDisabled = false;
        }
    }

    #hasTrackedMonitorWithObstructingWindow(): boolean {
        for (const monitorIndex of this.#trackedOverlays.values()) {
            if (global.display.get_monitor_in_fullscreen(monitorIndex)) {
                return true;
            }

            const windowActors = global.get_window_actors();
            for (const actor of windowActors) {
                const window = actor.metaWindow;
                if (
                    window.get_monitor() === monitorIndex &&
                    !window.minimized &&
                    window.is_maximized()
                ) {
                    return true;
                }
            }
        }
        return false;
    }
}
