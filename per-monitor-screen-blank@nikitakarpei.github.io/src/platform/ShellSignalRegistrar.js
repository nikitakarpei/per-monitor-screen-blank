import { logWarn, logErrorWithContext } from '../util/logger.js';

export class ShellSignalRegistrar {
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
                logErrorWithContext(error, 'failed to disconnect signal', { signalName });
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
                logErrorWithContext(error, 'disconnectAll failed');
            }
        }
    }
}
