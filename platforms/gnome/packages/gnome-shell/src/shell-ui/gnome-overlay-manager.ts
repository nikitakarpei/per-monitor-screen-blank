import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Layout from 'resource:///org/gnome/shell/ui/layout.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
    type LoggerPort,
    type Overlay,
    type PlatformEventSubscriber,
} from '@pmsb/application';
import {
    normalizeDimIntensityPercent,
    dimIntensityPercentToOpacity,
    normalizeFadeDurationMs,
} from '@pmsb/domain';
import { type Disposable } from '@pmsb/lifecycle';
import { GnomeMonitorIndex } from '../shell-infra/gnome-monitor-index.js';

export class GnomeOverlayManager implements Overlay, Disposable {
    readonly #logger: LoggerPort;
    readonly #indexResolver: GnomeMonitorIndex;
    readonly #unsubscribeMonitorRefresh: () => void;
    readonly #actors = new Map<string, OverlayRecord>();
    readonly #visibleMonitors = new Set<string>();
    #fadeDurationMs = 0;
    #targetOpacity = 0;

    constructor(
        logger: LoggerPort,
        indexResolver: GnomeMonitorIndex,
        eventSubscriber: PlatformEventSubscriber,
    ) {
        this.#logger = logger;
        this.#indexResolver = indexResolver;
        this.#unsubscribeMonitorRefresh = eventSubscriber.on(
            'monitors-geometry-changed',
            () => this.#refreshVisibleActors(),
        );
    }

    dispose(): void {
        this.#unsubscribeMonitorRefresh();
        for (const [monitorId, overlayRecord] of this.#actors) {
            this.#destroyOverlayRecord(monitorId, overlayRecord);
        }
        this.#actors.clear();
        this.#visibleMonitors.clear();
    }

    showForMonitor(monitorId: string): void {
        const overlayRecord = this.#ensureActor(monitorId);
        this.#showMonitor(monitorId, overlayRecord);
    }

    hideForMonitor(monitorId: string): void {
        this.#hideMonitor(monitorId);
    }

    clearAll(): void {
        const visibleMonitorIds = [...this.#visibleMonitors];
        for (const monitorId of visibleMonitorIds) {
            this.#hideMonitor(monitorId);
        }
    }

    setFadeDuration(durationMs: number): void {
        this.#fadeDurationMs = normalizeFadeDurationMs(durationMs);
    }

    setDimIntensityPercent(percent: number): void {
        this.#targetOpacity = dimIntensityPercentToOpacity(
            normalizeDimIntensityPercent(percent),
        );
        for (const monitorId of this.#visibleMonitors) {
            const overlayRecord = this.#actors.get(monitorId);
            if (!overlayRecord) continue;
            overlayRecord.actor.ease({
                opacity: this.#targetOpacity,
                duration: this.#fadeDurationMs,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        }
    }

    #refreshVisibleActors(): void {
        for (const monitorId of this.#visibleMonitors) {
            const overlayRecord = this.#actors.get(monitorId);
            if (!overlayRecord) {
                this.#logger.warn(
                    `visible overlay missing during constraint refresh: ${monitorId}`,
                );
                continue;
            }

            this.#refreshMonitorConstraint(monitorId, overlayRecord);
        }
    }

    #showMonitor(monitorId: string, overlayRecord: OverlayRecord): void {
        const { actor } = overlayRecord;
        if (this.#visibleMonitors.has(monitorId)) {
            this.#logger.warn(
                `show requested for already visible monitor: ${monitorId}`,
            );
            return;
        }
        this.#visibleMonitors.add(monitorId);
        actor.show();
        actor.ease({
            opacity: this.#targetOpacity,
            duration: this.#fadeDurationMs,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    #hideMonitor(monitorId: string): void {
        const overlayRecord = this.#actors.get(monitorId);
        if (!overlayRecord) {
            this.#logger.warn(
                `hide requested for unknown monitor, skipping: ${monitorId}`,
            );
            return;
        }
        if (!this.#visibleMonitors.has(monitorId)) {
            this.#logger.warn(
                `hide requested for already hidden monitor: ${monitorId}`,
            );
            return;
        }
        this.#visibleMonitors.delete(monitorId);
        const { actor } = overlayRecord;
        actor.ease({
            opacity: 0,
            duration: this.#fadeDurationMs,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                if (this.#visibleMonitors.has(monitorId)) return;
                this.#destroyOverlayRecord(monitorId, overlayRecord);
            },
        });
    }

    #ensureActor(monitorId: string): OverlayRecord {
        const existing = this.#actors.get(monitorId);
        if (existing) {
            this.#refreshMonitorConstraint(monitorId, existing);
            return existing;
        }

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
        // trackFullscreen:false keeps Shell from treating the chrome as
        // fullscreen-tracking chrome; this manager owns overlay visibility.
        const chromeParameters: {
            trackFullscreen: boolean;
            affectsStruts: boolean;
            affectsInputRegion?: boolean;
        } = {
            trackFullscreen: false,
            affectsStruts: false,
        };
        // affectsInputRegion:false prevents the overlay from absorbing pointer
        // events. GNOME 50's addTopChrome/shared chromeParameters path removed
        // this parameter, so only pass it on GNOME 49 where it is still recognized
        if (Number.parseInt(Config.PACKAGE_VERSION) < 50) {
            chromeParameters.affectsInputRegion = false;
        }
        Main.layoutManager.addTopChrome(actor, chromeParameters);

        const monitorIndex =
            this.#indexResolver.tryGetIndexByMonitorId(monitorId);
        if (monitorIndex === undefined) {
            this.#logger.warn(
                `overlay constraint skipped, monitor id not resolvable: ${monitorId}`,
            );
            const overlayRecord: OverlayRecord = {
                actor,
                monitorConstraint: null,
                monitorIndex: null,
            };
            this.#actors.set(monitorId, overlayRecord);
            return overlayRecord;
        }

        const overlayRecord: OverlayRecord = {
            actor,
            monitorConstraint: null,
            monitorIndex,
        };
        try {
            const monitorConstraint = new Layout.MonitorConstraint({
                index: monitorIndex,
            });
            actor.add_constraint(monitorConstraint);
            overlayRecord.monitorConstraint = monitorConstraint;
        } catch {
            this.#logger.warn(
                `failed to assign overlay monitor constraint: ${monitorId} -> ${monitorIndex}`,
            );
        }

        this.#actors.set(monitorId, overlayRecord);
        return overlayRecord;
    }

    #refreshMonitorConstraint(
        monitorId: string,
        overlayRecord: OverlayRecord,
    ): void {
        const monitorIndex =
            this.#indexResolver.tryGetIndexByMonitorId(monitorId);
        if (monitorIndex === undefined) {
            if (overlayRecord.monitorIndex === null) {
                this.#logger.warn(
                    `overlay constraint skipped, monitor id not resolvable: ${monitorId}`,
                );
            } else {
                this.#logger.warn(
                    `overlay constraint stale mapping unresolved: ${monitorId} -> ${overlayRecord.monitorIndex}`,
                );
            }
            return;
        }

        if (
            overlayRecord.monitorIndex !== null &&
            overlayRecord.monitorIndex !== monitorIndex
        ) {
            this.#logger.warn(
                `overlay constraint stale mapping refreshed: ${monitorId} -> ${overlayRecord.monitorIndex}, current=${monitorIndex}`,
            );
        }

        if (
            overlayRecord.monitorConstraint !== null &&
            overlayRecord.monitorIndex === monitorIndex
        ) {
            return;
        }

        if (overlayRecord.monitorConstraint !== null) {
            try {
                overlayRecord.actor.remove_constraint(
                    overlayRecord.monitorConstraint,
                );
            } catch {
                this.#logger.warn(
                    `failed to remove stale overlay constraint: ${monitorId}`,
                );
            } finally {
                overlayRecord.monitorConstraint = null;
            }
        }

        try {
            const monitorConstraint = new Layout.MonitorConstraint({
                index: monitorIndex,
            });
            overlayRecord.actor.add_constraint(monitorConstraint);
            overlayRecord.monitorConstraint = monitorConstraint;
            overlayRecord.monitorIndex = monitorIndex;
        } catch {
            this.#logger.warn(
                `failed to refresh overlay monitor constraint: ${monitorId} -> ${monitorIndex}`,
            );
        }
    }

    #destroyOverlayRecord(
        monitorId: string,
        overlayRecord: OverlayRecord,
    ): void {
        if (overlayRecord.monitorConstraint) {
            try {
                overlayRecord.actor.remove_constraint(
                    overlayRecord.monitorConstraint,
                );
            } catch {
                this.#logger.warn(
                    `failed to remove overlay constraint: ${monitorId}`,
                );
            } finally {
                overlayRecord.monitorConstraint = null;
            }
        }

        try {
            Main.layoutManager.removeChrome(overlayRecord.actor);
        } catch {
            this.#logger.warn(`failed to remove overlay chrome: ${monitorId}`);
        }

        try {
            overlayRecord.actor.hide();
            overlayRecord.actor.destroy();
        } catch {
            this.#logger.error(`failed to destroy overlay actor: ${monitorId}`);
        }
        this.#actors.delete(monitorId);
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

type OverlayRecord = {
    actor: OverlayActor;
    monitorConstraint: Layout.MonitorConstraint | null;
    monitorIndex: number | null;
};
