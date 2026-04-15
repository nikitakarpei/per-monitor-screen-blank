import { logWarn } from '../../shared/util/logger.js';

export class GnomeSignalRegistrar {
    constructor() {
        this._disconnectors = [];
    }

    connect(target, signalName, handler) {
        let id = 0;
        try {
            id = target.connect(signalName, handler);
        } catch (_) {
            logWarn('failed to connect signal', { signalName, targetType: target?.constructor?.name ?? 'unknown' });
            return false;
        }
        this._disconnectors.push(() => {
            if (!id) return;
            try {
                target.disconnect(id);
            } catch (error) {
                logWarn('failed to disconnect signal', { signalName, error: error?.message ?? String(error) });
            }
        });
        return true;
    }

    addDisconnector(disconnect) {
        this._disconnectors.push(disconnect);
    }

    disconnectAll() {
        for (const disconnect of this._disconnectors.splice(0)) {
            try {
                disconnect?.();
            } catch (error) {
                logWarn('disconnectAll failed', { error: error?.message ?? String(error) });
            }
        }
    }
}
