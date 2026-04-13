import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class ShellRuntimeProbe {
    #lastPointer = { x: null, y: null };
    #wasPointerOnMonitor = new Map();
    #lastActivityByMonitor = new Map();

    resetTargetActivity(monitorIndexes = []) {
        this.#wasPointerOnMonitor.clear();
        this.#lastActivityByMonitor.clear();
        const now = Date.now();
        for (const index of monitorIndexes)
            this.#lastActivityByMonitor.set(index, now);
    }

    sample(targetMonitorIndex) {
        const snapshot = this.sampleMonitors([targetMonitorIndex])[targetMonitorIndex];
        if (snapshot) return snapshot;
        return { isPointerOnTargetMonitor: false, targetIdleTimeMs: Number.POSITIVE_INFINITY };
    }

    sampleMonitors(targetMonitorIndexes) {
        const indexes = Array.isArray(targetMonitorIndexes) ? targetMonitorIndexes : [];
        const [x, y] = global.get_pointer();
        const pointerMonitor = this.#resolvePointerMonitor(x, y);
        const pointerMoved = x !== this.#lastPointer.x || y !== this.#lastPointer.y;
        const now = Date.now();
        const result = {};

        for (const targetMonitorIndex of indexes) {
            const isPointerOnTargetMonitor = pointerMonitor === targetMonitorIndex;
            const wasPointerOnTarget = this.#wasPointerOnMonitor.get(targetMonitorIndex) ?? false;
            const enteredTarget = isPointerOnTargetMonitor && !wasPointerOnTarget;
            const hadActivity = this.#lastActivityByMonitor.has(targetMonitorIndex);
            if (isPointerOnTargetMonitor && (pointerMoved || enteredTarget || !hadActivity))
                this.#lastActivityByMonitor.set(targetMonitorIndex, now);

            const lastActivityAt = this.#lastActivityByMonitor.get(targetMonitorIndex);
            const targetIdleTimeMs = lastActivityAt === undefined
                ? Number.POSITIVE_INFINITY
                : now - lastActivityAt;

            this.#wasPointerOnMonitor.set(targetMonitorIndex, isPointerOnTargetMonitor);
            result[targetMonitorIndex] = { isPointerOnTargetMonitor, targetIdleTimeMs };
        }

        this.#lastPointer = { x, y };
        return result;
    }

    #resolvePointerMonitor(x, y) {
        const monitors = Main.layoutManager?.monitors ?? [];
        for (let index = 0; index < monitors.length; index++) {
            const monitor = monitors[index];
            if (x >= monitor.x && x < monitor.x + monitor.width &&
                y >= monitor.y && y < monitor.y + monitor.height)
                return index;
        }

        if (typeof global.display?.get_primary_monitor === 'function')
            return global.display.get_primary_monitor();

        return 0;
    }
}
