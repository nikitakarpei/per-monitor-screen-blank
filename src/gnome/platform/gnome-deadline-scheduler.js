import GLib from 'gi://GLib';
import { logWarn, logErrorWithContext } from '../../shared/util/logger.js';

export class GnomeDeadlineScheduler {
    constructor({ onDeadline }) {
        this._onDeadline = onDeadline;
        this._entries = new Map();
        this._tokens = new Map();
    }

    schedule(deadlineKey, monitorId, deadlineMs) {
        this._schedule(deadlineKey, monitorId, deadlineMs);
    }

    cancel(deadlineKey, monitorId) {
        this._removeEntry(this._buildKey(deadlineKey, monitorId));
    }

    cancelMonitor(monitorId) {
        const prefix = `${String(monitorId ?? '')}:`;
        for (const key of this._entries.keys()) {
            if (!key.startsWith(prefix)) continue;
            this._removeEntry(key);
            this._tokens.delete(key);
        }
    }

    cancelAll() {
        for (const key of this._entries.keys()) {
            this._removeEntry(key);
            this._tokens.delete(key);
        }
    }

    _schedule(deadlineKey, monitorId, deadlineMs) {
        const key = this._buildKey(deadlineKey, monitorId);
        this._removeEntry(key);
        const token = (this._tokens.get(key) ?? 0) + 1;
        this._tokens.set(key, token);
        const delayMs = Math.max(0, Math.ceil(deadlineMs - Date.now()));
        const sourceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            const latestToken = this._tokens.get(key);
            if (latestToken !== token) {
                logWarn('ignored stale monitor deadline callback', { deadlineKey, monitorId, token, latestToken, deadlineMs });
                return GLib.SOURCE_REMOVE;
            }
            this._entries.delete(key);
            this._tokens.delete(key);
            try {
                this._onDeadline?.({ deadlineKey, monitorId, token, deadlineMs });
            } catch (error) {
                logErrorWithContext(error, 'monitor deadline callback failed', { deadlineKey, monitorId, token });
            }
            return GLib.SOURCE_REMOVE;
        });
        if (!sourceId) {
            this._tokens.delete(key);
            logWarn('monitor deadline schedule skipped: no GLib source id', { deadlineKey, monitorId, deadlineMs, token });
            return;
        }
        this._entries.set(key, { sourceId, token, deadlineKey });
    }

    _removeEntry(key) {
        const entry = this._entries.get(key);
        if (!entry) return;
        this._entries.delete(key);
        this._tokens.delete(key);
        try {
            GLib.Source.remove(entry.sourceId);
        } catch (error) {
            logWarn('failed to remove monitor deadline source', {
                deadlineKey: entry.deadlineKey,
                token: entry.token,
                sourceId: entry.sourceId,
                error: error?.message ?? String(error),
            });
        }
    }

    _buildKey(deadlineKey, monitorId) {
        return `${String(monitorId ?? '')}:${deadlineKey}`;
    }
}
