// Type declarations for GNOME Shell pointerWatcher module
// https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/pointerWatcher.js

declare module 'resource:///org/gnome/shell/ui/pointerWatcher.js' {
    export interface PointerWatch {
        /** Remove the watch */
        remove(): void;
    }

    export interface PointerWatcher {
        /**
         * Add a watch for pointer movement.
         * @param interval - Sampling interval in milliseconds
         * @param callback - Function called with (x, y) coordinates
         * @returns A PointerWatch instance
         */
        addWatch(
            interval: number,
            callback: (x: number, y: number) => void,
        ): PointerWatch;

        /**
         * Remove a watch (internal method, typically use watch.remove() instead).
         * @param watch - The watch to remove
         */
        _removeWatch(watch: PointerWatch): void;
    }

    /**
     * Get the singleton PointerWatcher instance.
     * @returns The PointerWatcher singleton
     */
    export function getPointerWatcher(): PointerWatcher;
}
