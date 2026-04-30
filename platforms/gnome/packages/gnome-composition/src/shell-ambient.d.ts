import '@girs/gnome-shell/ambient';
import '@girs/gnome-shell/extensions/global';

declare module 'resource:///org/gnome/shell/ui/pointerWatcher.js' {
    export interface PointerWatch {
        remove(): void;
    }

    export interface PointerWatcher {
        addWatch(
            interval: number,
            callback: (x: number, y: number) => void,
        ): PointerWatch;
        _removeWatch(watch: PointerWatch): void;
    }

    export function getPointerWatcher(): PointerWatcher;
}
