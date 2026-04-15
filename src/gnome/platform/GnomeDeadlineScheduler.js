import GLib from 'gi://GLib';
import { logWarn, logErrorWithContext } from '../../shared/util/logger.js';

export class GnomeDeadlineScheduler {
    constructor({ onDeadline }) {
        this._onDeadline = onDeadline;
        this._entries = new Map();
    }

    scheduleAutoBlack(monitorId, deadlineMs, token) {
        this._schedule('auto-black', monitorId, deadlineMs, token);
    }

    scheduleKeepAwakeExpiry(monitorId, deadlineMs, token) {
        this._schedule('keep-awake-expiry', monitorId, deadlineMs, token);
    }

    cancelAutoBlack(monitorId) {
        this._removeEntry(this._buildKey('auto-black', monitorId));
    }

    cancelKeepAwakeExpiry(monitorId) {
        this._removeEntry(this._buildKey('keep-awake-expiry', monitorId));
    }

    cancelMonitor(monitorId) {
        const prefix = `${String(monitorId ?? '')}:`;
        for (const key of [...this._entries.keys()]) {
            if (!key.startsWith(prefix)) continue;
            this._removeEntry(key);
        }
    }

    cancelAll() {
        for (const key of [...this._entries.keys()])
            this._removeEntry(key);
    }

    _schedule(kind, monitorId, deadlineMs, token) {
        const key = this._buildKey(kind, monitorId);
        this._removeEntry(key);
        const delayMs = Math.max(0, Math.ceil(deadlineMs - Date.now()));
        const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._entries.delete(key);
            try {
                this._onDeadline?.({ kind, monitorId, token, deadlineMs });
            } catch (error) {
                logErrorWithContext(error, 'monitor deadline callback failed', { kind, monitorId, token });
            }
            return GLib.SOURCE_REMOVE;
        });
        if (!sourceId) {
            logWarn('monitor deadline schedule skipped: no GLib source id', { kind, monitorId, deadlineMs, token });
            return;
        }
        this._entries.set(key, { sourceId, token, kind });
    }

    _removeEntry(key) {
        const entry = this._entries.get(key);
        if (!entry) return;
        this._entries.delete(key);
        try {
            GLib.Source.remove(entry.sourceId);
        } catch (error) {
            logWarn('failed to remove monitor deadline source', {
                kind: entry.kind,
                token: entry.token,
                sourceId: entry.sourceId,
                error: error?.message ?? String(error),
            });
        }
    }

    _buildKey(kind, monitorId) {
        return `${String(monitorId ?? '')}:${kind}`;
    }
}
