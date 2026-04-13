import * as PointerWatcher from 'resource:///org/gnome/shell/ui/pointerWatcher.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { logInfo, logWarn, logErrorWithContext } from '../util/logger.js';

export class ShellPointerActivitySource {
    constructor() {
        this._pointerWatcher = PointerWatcher.getPointerWatcher();
        this._watch = null;
        this.onPointerActivity = null;
        this._lastMonitorIndex = null;
        this._lastPointer = { x: null, y: null };
    }

    start(callbacks = {}) {
        this.stop();
        this.onPointerActivity = callbacks.onPointerActivity ?? null;
        try {
            this._watch = this._pointerWatcher.addWatch(100, (x, y) => {
                this._handlePointerSample({ x, y, eventType: 'pointer-watch' });
            });
        } catch (error) {
            logErrorWithContext(error, 'failed to start shell pointer watcher');
            throw error;
        }
    }

    stop() {
        if (this._watch) {
            try {
                this._pointerWatcher._removeWatch(this._watch);
            } catch (error) {
                logWarn('failed to stop shell pointer watcher', { error: error?.message ?? String(error) });
            }
        }
        this._watch = null;
        this.onPointerActivity = null;
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

    _handlePointerSample({ x, y, eventType = 'pointer-watch' }) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            logInfo('pointer watcher returned invalid coordinates; falling back to global pointer', { x, y, eventType });
            [x, y] = global.get_pointer();
        }

        const previousMonitorIndex = this._lastMonitorIndex;
        const monitorIndex = this._resolveMonitorIndex(x, y);
        const pointerMoved = x !== this._lastPointer.x || y !== this._lastPointer.y;
        const monitorChanged = previousMonitorIndex !== monitorIndex;
        this._lastPointer = { x, y };
        this._lastMonitorIndex = monitorIndex;

        if (!pointerMoved && !monitorChanged)
            return;

        this.onPointerActivity?.({
            eventType,
            x,
            y,
            monitorIndex,
            previousMonitorIndex,
        });
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

        logInfo('failed to resolve pointer monitor; defaulting to monitor 0', { x, y });
        return 0;
    }
}
