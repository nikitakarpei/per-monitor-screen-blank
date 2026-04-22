import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
    dimIntensityPercentToOpacity,
    normalizeDimIntensityPercent,
} from '../../serialization/numeric/dim-intensity.js';
import { normalizeFadeDurationMs } from '../../serialization/numeric/fade-duration.js';
import { LoggerPort } from '../../util/logger.js';
import { PlatformEventSubscriber } from '../../app/ports/platform-events.js';
import { Overlay } from '../../app/ports/overlay.js';
import { GnomeMonitorIndex } from '../shell-infra/gnome-monitor-index.js';

/** GNOME Shell overlay manager implementing the Overlay port. */
export class GnomeOverlayManager implements Overlay {
    readonly #actors: Map<string, OverlayActor> = new Map();
    readonly #visibleMonitors: Set<string> = new Set();
    #fadeDurationMs: number = 0;
    #targetOpacity: number = 0;
    readonly #logger: LoggerPort;
    readonly #indexResolver: GnomeMonitorIndex;
    readonly #unsubscribeGeometry: () => void;

    constructor(options: {
        logger: LoggerPort;
        indexResolver: GnomeMonitorIndex;
        eventSubscriber: PlatformEventSubscriber;
    }) {
        this.#logger = options.logger;
        this.#indexResolver = options.indexResolver;
        this.#unsubscribeGeometry = options.eventSubscriber.on(
            'monitors-geometry-changed',
            () => this.#syncGeometry(),
        );
    }

    disable(): void {
        this.#unsubscribeGeometry();
        for (const [monitorId, actor] of this.#actors) {
            try {
                Main.layoutManager.removeChrome(actor);
            } catch {
                this.#logger.warn(
                    `failed to remove overlay chrome on disable: ${monitorId}`,
                );
            }
            actor.destroy();
            this.#logger.info(
                `destroyed overlay actor on disable: ${monitorId}`,
            );
        }
        this.#actors.clear();
        this.#visibleMonitors.clear();
    }

    showForMonitor(monitorId: string): void {
        const actor = this.#ensureActor(monitorId);
        this.#showMonitor(monitorId, actor);
    }

    hideForMonitor(monitorId: string): void {
        this.#hideMonitor(monitorId);
    }

    clearAll(): void {
        this.#logger.info(
            `clearing all overlay monitors: visible=${this.#visibleMonitors.size}, actors=${this.#actors.size}`,
        );

        const visibleMonitorIds = [...this.#visibleMonitors];
        for (const monitorId of visibleMonitorIds) {
            this.#hideMonitor(monitorId);
        }
    }

    setFadeDuration(durationMs: number): void {
        this.#fadeDurationMs = normalizeFadeDurationMs(durationMs, durationMs);
    }

    setDimIntensityPercent(percent: number): void {
        this.#targetOpacity = dimIntensityPercentToOpacity(
            normalizeDimIntensityPercent(percent, percent),
        );
        for (const monitorId of this.#visibleMonitors) {
            const actor = this.#actors.get(monitorId);
            if (!actor) continue;
            actor.ease({
                opacity: this.#targetOpacity,
                duration: this.#fadeDurationMs,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }
    }

    #showMonitor(monitorId: string, actor: OverlayActor): void {
        if (this.#visibleMonitors.has(monitorId)) {
            this.#logger.info(
                `show requested for already visible monitor: ${monitorId}`,
            );
            return;
        }
        this.#visibleMonitors.add(monitorId);
        this.#syncGeometryForMonitor(monitorId, actor);
        actor.show();
        actor.ease({
            opacity: this.#targetOpacity,
            duration: this.#fadeDurationMs,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    #hideMonitor(monitorId: string): void {
        const actor = this.#actors.get(monitorId);
        if (!actor) {
            this.#logger.info(
                `hide requested for unknown monitor, skipping: ${monitorId}`,
            );
            return;
        }
        if (!this.#visibleMonitors.has(monitorId)) {
            this.#logger.info(
                `hide requested for already hidden monitor: ${monitorId}`,
            );
            return;
        }
        this.#visibleMonitors.delete(monitorId);
        actor.ease({
            opacity: 0,
            duration: this.#fadeDurationMs,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                if (this.#visibleMonitors.has(monitorId)) return;
                actor.hide();
                try {
                    Main.layoutManager.removeChrome(actor);
                } catch {
                    this.#logger.warn(
                        `failed to remove overlay chrome: ${monitorId}`,
                    );
                }
                actor.destroy();
                this.#actors.delete(monitorId);
            },
        });
    }

    #syncGeometry(): void {
        for (const monitorId of this.#visibleMonitors) {
            const actor = this.#actors.get(monitorId);
            if (actor) this.#syncGeometryForMonitor(monitorId, actor);
        }
    }

    #syncGeometryForMonitor(monitorId: string, actor: OverlayActor): void {
        const monitorIndex =
            this.#indexResolver.tryGetIndexByMonitorId(monitorId);
        if (monitorIndex === undefined) {
            this.#logger.warn(
                `geometry sync skipped, monitor id not resolvable: ${monitorId}`,
            );
            return;
        }
        const monitor = Main.layoutManager.monitors[monitorIndex];
        if (!monitor) {
            this.#logger.warn(
                `geometry sync skipped, monitor index out of range: id=${monitorId}, index=${monitorIndex}`,
            );
            return;
        }

        actor.set_position(monitor.x, monitor.y);
        actor.set_size(monitor.width, monitor.height);
    }

    #ensureActor(monitorId: string): OverlayActor {
        const existing = this.#actors.get(monitorId);
        if (existing) return existing;

        const actor = new St.Widget({
            style_class: 'per-monitor-screen-blank-overlay',
            reactive: false,
            can_focus: false,
            track_hover: false,
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            opacity: 0,
        }) as OverlayActor;
        actor.hide();
        // trackFullscreen:false keeps the overlay visible over fullscreen
        // windows by suppressing Mutter's unredirect optimization.
        Main.layoutManager.addChrome(actor, {
            trackFullscreen: false,
            affectsInputRegion: false,
            affectsStruts: false,
        });
        this.#logger.info(`added overlay chrome: ${monitorId}`);
        this.#actors.set(monitorId, actor);
        this.#syncGeometryForMonitor(monitorId, actor);

        return actor;
    }
}

/** Ease properties for Clutter animations. */
type EaseProperties = {
    opacity: number;
    duration: number;
    mode: Clutter.AnimationMode;
    onComplete?: () => void;
};

/**
 * Overlay actor type with GNOME Shell animation extensions.
 * In GNOME 49, `ease` and `ease_property` methods are added to Clutter.Actor
 * via GNOME Shell's environment.js monkey-patching. Since the GIR types for
 * clutter-18 don't include these extensions, we explicitly augment the type.
 */
type OverlayActor = Clutter.Actor & {
    ease(properties: EaseProperties): void;
    ease_property<T>(
        propertyName: string,
        target: T,
        properties: EaseProperties,
    ): void;
};
