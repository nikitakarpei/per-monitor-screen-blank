import Adw from 'gi://Adw';
import type { UserNotifications } from '@pmsb/application';
import type { Disposable } from '@pmsb/lifecycle';

export class AdwNotifications implements UserNotifications, Disposable {
    readonly #window: Adw.PreferencesWindow;

    constructor(window: Adw.PreferencesWindow) {
        this.#window = window;
    }

    show({
        title,
        priority,
    }: {
        title: string;
        priority: 'low' | 'normal' | 'high';
    }): void {
        const toast = new Adw.Toast({
            title,
            timeout: priority === 'high' ? 6 : 4,
        });
        this.#window.add_toast(toast);
    }

    dispose(): void {}
}
