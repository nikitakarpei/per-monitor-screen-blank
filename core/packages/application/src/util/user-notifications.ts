import type { Disposable } from '@pmsb/lifecycle';

export interface UserNotifications extends Disposable {
    show(notification: {
        title: string;
        priority: 'low' | 'normal' | 'high';
    }): void;
}
