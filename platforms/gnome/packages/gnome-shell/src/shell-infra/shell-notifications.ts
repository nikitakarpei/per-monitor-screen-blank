import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import type { UserNotifications } from '@pmsb/application';
import type { Disposable } from '@pmsb/lifecycle';

export class ShellNotifications implements UserNotifications, Disposable {
    show({
        title,
        priority,
    }: {
        title: string;
        priority: 'low' | 'normal' | 'high';
    }): void {
        if (priority === 'high') {
            Main.notifyError(title, '');
        } else {
            Main.notify(title, '');
        }
    }

    dispose(): void {}
}
