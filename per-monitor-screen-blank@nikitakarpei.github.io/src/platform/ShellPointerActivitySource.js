import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { logWarn, logErrorWithContext } from '../util/logger.js';

export class ShellPointerActivitySource {
    constructor() {
        this._stageSignalId = 0;
        this._callbacks = null;
        this._lastMonitorIndex = null;
        this._lastPointer = { x: null, y: null };
    }

    start(callbacks = {}) {
        this.stop();
        this._callbacks = callbacks;
        try {
            this._stageSignalId = global.stage.connect('captured-event', (_actor, event) => this._handleCapturedEvent(event));
        } catch (error) {
            logErrorWithContext(error, 'failed to connect stage captured-event');
            this._callbacks?.onDegraded?.({
                reason: 'stage-captured-event-unavailable',
            });
        }
    }

    stop() {
        if (this._stageSignalId) {
            try {
                global.stage.disconnect(this._stageSignalId);
            } catch (error) {
                logErrorWithContext(error, 'failed to disconnect stage captured-event', { signalId: this._stageSignalId });
            }
        }
        this._stageSignalId = 0;
        this._callbacks = null;
        this._lastMonitorIndex = null;
        this._lastPointer = { x: null, y: null };
    }

    getPointerSnapshot() {
        const [x, y] = global.get_pointer();
        return {
            x,
            y,
            monitorIndex: this._resolveMonitorIndex(x, y),
        };
    }

    _handleCapturedEvent(event) {
        const eventType = event?.type?.() ?? null;
        if (![
            Clutter.EventType.MOTION,
            Clutter.EventType.ENTER,
            Clutter.EventType.LEAVE,
        ].includes(eventType))
            return Clutter.EVENT_PROPAGATE;

        let x = null;
        let y = null;
        try {
            [x, y] = event?.get_coords?.() ?? [];
        } catch (error) {
            logWarn('failed to read pointer event coordinates; falling back to global pointer', {
                eventType,
                error: String(error),
            });
        }

        if (!Number.isFinite(x) || !Number.isFinite(y))
            [x, y] = global.get_pointer();

        const previousMonitorIndex = this._lastMonitorIndex;
        const monitorIndex = this._resolveMonitorIndex(x, y);
        const pointerMoved = x !== this._lastPointer.x || y !== this._lastPointer.y;
        const monitorChanged = previousMonitorIndex !== monitorIndex;
        this._lastPointer = { x, y };
        this._lastMonitorIndex = monitorIndex;

        if (!pointerMoved && !monitorChanged && eventType !== Clutter.EventType.ENTER)
            return Clutter.EVENT_PROPAGATE;

        this._callbacks?.onPointerActivity?.({
            eventType,
            x,
            y,
            monitorIndex,
            previousMonitorIndex,
        });
        return Clutter.EVENT_PROPAGATE;
    }

    _resolveMonitorIndex(x, y) {
        const monitors = Main.layoutManager?.monitors ?? [];
        for (let index = 0; index < monitors.length; index++) {
            const monitor = monitors[index];
            if (x >= monitor.x && x < monitor.x + monitor.width &&
                y >= monitor.y && y < monitor.y + monitor.height)
                return index;
        }

        if (typeof global.display?.get_primary_monitor === 'function')
            return global.display.get_primary_monitor();

        logWarn('failed to resolve pointer monitor; defaulting to monitor 0', { x, y });
        return 0;
    }
}
