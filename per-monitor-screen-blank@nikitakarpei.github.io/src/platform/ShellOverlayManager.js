import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { DEFAULTS } from '../core/defaults.js';
import { normalizeFadeDurationMs } from '../core/fadeDuration.js';
import { logInfo, logWarn } from '../util/logger.js';

const FADE_DURATION_MS = DEFAULTS.fadeDurationMs;

export class ShellOverlayManager {
    #actors = new Map();
    #visibleMonitors = new Set();
    #signalIds = [];
    #fadeDurationMs = FADE_DURATION_MS;

    disable() {
        this.setBlackMonitors([]);
        this.#unbindGeometrySignals();
        for (const actor of this.#actors.values()) {
            Main.layoutManager.removeChrome(actor);
            actor.destroy();
        }
        this.#actors.clear();
        this.#visibleMonitors.clear();
    }

    setBlackMonitors(monitorIndexes = []) {
        const nextIndexes = new Set(monitorIndexes);
        if (nextIndexes.size === 0 && this.#actors.size > 0)
            logInfo('clearing all black monitors');
        if (nextIndexes.size > 0 && this.#signalIds.length === 0)
            this.#bindGeometrySignals();

        for (const monitorIndex of nextIndexes) {
            const actor = this.#ensureActor(monitorIndex);
            this.#syncGeometryForMonitor(monitorIndex, actor);
            this.#showMonitor(monitorIndex, actor);
        }

        for (const monitorIndex of [...this.#actors.keys()]) {
            if (nextIndexes.has(monitorIndex)) continue;
            this.#hideMonitor(monitorIndex);
        }
    }

    setFadeDuration(durationMs = FADE_DURATION_MS) {
        this.#fadeDurationMs = normalizeFadeDurationMs(durationMs, FADE_DURATION_MS);
    }

    #showMonitor(monitorIndex, actor) {
        if (this.#visibleMonitors.has(monitorIndex)) return;
        this.#visibleMonitors.add(monitorIndex);
        actor.show();
        actor.ease({
            opacity: 255,
            duration: this.#fadeDurationMs,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    #hideMonitor(monitorIndex) {
        const actor = this.#actors.get(monitorIndex);
        if (!actor) return;
        this.#visibleMonitors.delete(monitorIndex);
        actor.ease({
            opacity: 0,
            duration: this.#fadeDurationMs,
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                if (this.#visibleMonitors.has(monitorIndex)) return;
                actor.hide();
                Main.layoutManager.removeChrome(actor);
                actor.destroy();
                this.#actors.delete(monitorIndex);
                if (this.#actors.size === 0)
                    this.#unbindGeometrySignals();
            },
        });
    }

    #bindGeometrySignals() {
        this.#unbindGeometrySignals();
        const layoutManager = Main.layoutManager;
        this.#tryConnect(layoutManager, 'monitors-changed');
    }

    #unbindGeometrySignals() {
        for (const { target, id } of this.#signalIds) {
            try {
                target.disconnect(id);
            } catch (error) {
                logWarn('overlay signal disconnect failed', { id, error: error?.message ?? String(error) });
            }
        }
        this.#signalIds = [];
    }

    #tryConnect(target, signalName) {
        try {
            const id = target.connect(signalName, () => this.#syncGeometry());
            this.#signalIds.push({ target, id });
        } catch (error) {
            logWarn('overlay signal unavailable', { signalName, targetType: target?.constructor?.name ?? 'unknown' });
        }
    }

    #syncGeometry() {
        for (const [monitorIndex, actor] of this.#actors)
            this.#syncGeometryForMonitor(monitorIndex, actor);
    }

    #syncGeometryForMonitor(monitorIndex, actor) {
        const monitor = Main.layoutManager.monitors?.[monitorIndex] ?? Main.layoutManager.primaryMonitor;
        if (!monitor) {
            logWarn('failed to resolve monitor geometry', { monitorIndex });
            return;
        }

        actor.set_position(monitor.x, monitor.y);
        actor.set_size(monitor.width, monitor.height);
    }

    #ensureActor(monitorIndex) {
        let actor = this.#actors.get(monitorIndex);
        if (actor) return actor;

        actor = new St.Widget({
            style_class: 'per-monitor-screen-blank-overlay',
            reactive: false,
            can_focus: false,
            track_hover: false,
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            opacity: 0,
        });
        actor.set_style('background-color: #000000;');
        actor.hide();
        Main.layoutManager.addChrome(actor, { affectsInputRegion: false, trackFullscreen: true });
        this.#actors.set(monitorIndex, actor);
        return actor;
    }
}
