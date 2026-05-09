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

        const actor = this.#createOverlayActor();
        const chromeParameters = this.#buildChromeParameters();
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
        this.#addMonitorConstraint(monitorId, overlayRecord, monitorIndex);

        this.#actors.set(monitorId, overlayRecord);
        return overlayRecord;
    }

    #createOverlayActor(): Clutter.Actor {
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
        actor.hide();
        return actor;
    }

    #buildChromeParameters(): {
        trackFullscreen: boolean;
        affectsStruts: boolean;
        affectsInputRegion?: boolean;
    } {
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
        return chromeParameters;
    }

    #addMonitorConstraint(
        monitorId: string,
        overlayRecord: OverlayRecord,
        monitorIndex: number,
    ): void {
        try {
            const monitorConstraint = new Layout.MonitorConstraint({
                index: monitorIndex,
            });
            overlayRecord.actor.add_constraint(monitorConstraint);
            overlayRecord.monitorConstraint = monitorConstraint;
        } catch {
            this.#logger.warn(
                `failed to assign overlay monitor constraint: ${monitorId} -> ${monitorIndex}`,
            );
        }
    }

    #removeMonitorConstraint(
        monitorId: string,
        overlayRecord: OverlayRecord,
    ): void {
        if (!overlayRecord.monitorConstraint) return;
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

        this.#removeMonitorConstraint(monitorId, overlayRecord);
        this.#addMonitorConstraint(monitorId, overlayRecord, monitorIndex);
        overlayRecord.monitorIndex = monitorIndex;
    }

    #destroyOverlayRecord(
        monitorId: string,
        overlayRecord: OverlayRecord,
    ): void {
        this.#removeMonitorConstraint(monitorId, overlayRecord);

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

type OverlayRecord = {
    actor: Clutter.Actor;
    monitorConstraint: Layout.MonitorConstraint | null;
    monitorIndex: number | null;
};
