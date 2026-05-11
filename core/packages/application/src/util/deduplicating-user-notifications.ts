import type { Disposable } from '@pmsb/lifecycle';
import type { UserNotifications } from './user-notifications.js';

const MS_PER_SECOND = 1000;
const DEDUP_WINDOW_MS = Number(MS_PER_SECOND);

export class DeduplicatingUserNotifications
    implements UserNotifications, Disposable
{
    #delegate: UserNotifications;
    #lastNotifiedAt: number | undefined = undefined;

    constructor(delegate: UserNotifications) {
        this.#delegate = delegate;
    }

    show(notification: {
        title: string;
        priority: 'low' | 'normal' | 'high';
    }): void {
        const now = Date.now();
        if (
            this.#lastNotifiedAt !== undefined &&
            now - this.#lastNotifiedAt < DEDUP_WINDOW_MS
        ) {
            return;
        }
        this.#lastNotifiedAt = now;
        this.#delegate.show(notification);
    }

    dispose(): void {
        this.#lastNotifiedAt = undefined;
        this.#delegate.dispose();
    }
}
