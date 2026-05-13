import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type {
    LoggerPort,
    Overlay,
    PlatformEventEmitter,
} from '@pmsb/application';
import {
    normalizeDimIntensityPercent,
    dimIntensityPercentToOpacity,
    normalizeFadeDurationMs,
} from '@pmsb/domain';
import type { Disposable } from '@pmsb/lifecycle';
import type { GnomeMonitorIndex } from '../shell-infra/gnome-monitor-index.js';

export class GnomeOverlayManager implements Overlay, Disposable {
    readonly #logger: LoggerPort;
    readonly #indexResolver: GnomeMonitorIndex;
    readonly #eventBus: PlatformEventEmitter;

    readonly #activeActors = new Map<string, Clutter.Actor>();
    readonly #hidingActors = new Map<string, Clutter.Actor>();
    #fadeDurationMs = 0;
    #targetOpacity = 0;

    constructor(
        logger: LoggerPort,
        indexResolver: GnomeMonitorIndex,
        eventBus: PlatformEventEmitter,
    ) {
        this.#logger = logger;
        this.#indexResolver = indexResolver;
        this.#eventBus = eventBus;
    }

    dispose(): void {
        for (const [monitorId, actor] of this.#activeActors) {
            this.#tryDestroyOverlayActor(monitorId, actor);
        }
        this.#activeActors.clear();

        for (const [monitorId, actor] of this.#hidingActors) {
            this.#tryDestroyOverlayActor(monitorId, actor);
        }
        this.#hidingActors.clear();
    }

    showForMonitor(monitorId: string): void {
        this.#hidingActors.delete(monitorId);

        if (this.#activeActors.has(monitorId)) {
            throw new Error(`overlay already visible for monitor ${monitorId}`);
        }

        const monitorIndex = this.#indexResolver.getIndexByMonitorId(monitorId);

        const actor = this.#createOverlayActor(monitorId, monitorIndex);
        this.#activeActors.set(monitorId, actor);

        this.#eventBus.emit({
            type: 'overlay-shown',
            payload: { monitorId, monitorIndex },
        });
    }

    hideForMonitor(monitorId: string): void {
        const actor = this.#activeActors.get(monitorId);
        if (!actor) {
            throw new Error(`no overlay visible for monitor ${monitorId}`);
        }

        this.#activeActors.delete(monitorId);
        this.#hidingActors.set(monitorId, actor);

        this.#eventBus.emit({
            type: 'overlay-hidden',
            payload: { monitorId },
        });

        actor.ease({
            opacity: 0,
            duration: this.#fadeDurationMs,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                this.#hidingActors.delete(monitorId);
                this.#tryDestroyOverlayActor(monitorId, actor);
            },
        });
    }

    setFadeDuration(durationMs: number): void {
        this.#fadeDurationMs = normalizeFadeDurationMs(durationMs);
    }

    setDimIntensityPercent(percent: number): void {
        this.#targetOpacity = dimIntensityPercentToOpacity(
            normalizeDimIntensityPercent(percent),
        );

        for (const actor of this.#activeActors.values()) {
            actor.ease({
                opacity: this.#targetOpacity,
                duration: this.#fadeDurationMs,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }
    }

    #createOverlayActor(
        monitorId: string,
        monitorIndex: number,
    ): Clutter.Actor {
        const actor = new St.Widget({
            style_class: 'per-monitor-screen-blank-overlay',
            reactive: false,
            can_focus: false,
            track_hover: false,
            layout_manager: new Clutter.BinLayout(),
            x_expand: true,
            y_expand: true,
            opacity: 0,
        }) as Clutter.Actor;

        try {
            actor.hide();
            actor.add_constraint(
                new Layout.MonitorConstraint({
                    index: monitorIndex,
                }),
            );

            const chromeParameters = this.#buildChromeParameters();
            Main.layoutManager.addChrome(actor, chromeParameters);

            actor.show();
            actor.ease({
                opacity: this.#targetOpacity,
                duration: this.#fadeDurationMs,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        } catch (error) {
            this.#tryDestroyOverlayActor(monitorId, actor);
            throw error;
        }

        return actor;
    }

    #buildChromeParameters() {
        const chromeParameters: Record<string, boolean> = {
            trackFullscreen: false,
            affectsStruts: false,
        };
        // affectsInputRegion:false prevents the overlay from absorbing pointer
        // events. GNOME 50 removed this parameter from addChrome, so only
        // pass it on GNOME 49 where it is still recognized.
        if (Number.parseInt(Config.PACKAGE_VERSION) < 50) {
            chromeParameters.affectsInputRegion = false;
        }
        return chromeParameters;
    }

    #tryDestroyOverlayActor(monitorId: string, actor: Clutter.Actor): void {
        try {
            Main.layoutManager.removeChrome(actor);
        } catch (error) {
            this.#logger.error(
                `failed to remove overlay chrome: ${monitorId}`,
                error as object | undefined,
            );
        }

        actor.destroy();
    }
}
