import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GnomePointerVisibility } from './gnome-pointer-visibility.js';

const mocks = vi.hoisted(() => ({
    inhibit: vi.fn(),
    uninhibit: vi.fn(),
    pointer: [10, 10],
    tick: undefined as (() => boolean) | undefined,
    timeoutAdd: vi.fn(),
    sourceRemove: vi.fn(),
    resolveIndex: vi.fn<(id: string) => number | undefined>(),
    monitors: [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 100, y: 0, width: 100, height: 100 },
    ],
}));

vi.mock('gi://GLib', () => ({
    default: {
        PRIORITY_DEFAULT: 0,
        SOURCE_CONTINUE: true,
        timeout_add: mocks.timeoutAdd,
        Source: { remove: mocks.sourceRemove },
    },
}));
vi.mock('resource:///org/gnome/shell/ui/main.js', () => ({
    layoutManager: {
        monitors: mocks.monitors,
    },
}));

describe('cursor visibility over monitor overlays', () => {
    let pointerVisibility: GnomePointerVisibility;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.pointer = [10, 10];
        mocks.tick = undefined;
        mocks.resolveIndex.mockImplementation(Number);
        mocks.timeoutAdd.mockImplementation(
            (_priority: number, _interval: number, tick: () => boolean) => {
                mocks.tick = tick;
                return 1;
            },
        );
        vi.stubGlobal('global', {
            backend: {
                get_cursor_tracker: () => ({
                    inhibit_cursor_visibility: mocks.inhibit,
                    uninhibit_cursor_visibility: mocks.uninhibit,
                }),
            },
            get_pointer: () => mocks.pointer,
        });
        pointerVisibility = new GnomePointerVisibility({
            getIndexByMonitorId: Number,
            tryGetIndexByMonitorId: mocks.resolveIndex,
            getMonitorIdByIndex: String,
            tryGetMonitorIdByIndex: String,
        });
    });

    afterEach(() => {
        pointerVisibility.dispose();
        vi.unstubAllGlobals();
    });

    it('does not poll without hidden monitors', () => {
        pointerVisibility.setHiddenMonitors([]);
        expect(mocks.timeoutAdd).not.toHaveBeenCalled();
    });

    it('hides the cursor when its monitor blanks and restores it on wake', () => {
        pointerVisibility.setHiddenMonitors(['0']);
        expect(mocks.inhibit).toHaveBeenCalledExactlyOnceWith();
        pointerVisibility.setHiddenMonitors([]);
        expect(mocks.uninhibit).toHaveBeenCalledExactlyOnceWith();
    });

    it('leaves the cursor visible when another monitor blanks', () => {
        pointerVisibility.setHiddenMonitors(['1']);
        expect(mocks.inhibit).not.toHaveBeenCalled();
    });

    it('updates when the pointer enters and leaves a manually blanked monitor', () => {
        pointerVisibility.setHiddenMonitors(['1']);
        mocks.pointer = [110, 10];
        expect(mocks.tick?.()).toBe(true);
        expect(mocks.inhibit).toHaveBeenCalledOnce();
        mocks.pointer = [10, 10];
        mocks.tick?.();
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
    });

    it('pairs inhibition once even with multiple overlays and repeated samples', () => {
        pointerVisibility.setHiddenMonitors(['0']);
        pointerVisibility.setHiddenMonitors(['0', '1']);
        mocks.tick?.();
        mocks.pointer = [110, 10];
        mocks.tick?.();
        pointerVisibility.setHiddenMonitors(['1']);
        expect(mocks.inhibit).toHaveBeenCalledOnce();
        expect(mocks.uninhibit).not.toHaveBeenCalled();
        pointerVisibility.setHiddenMonitors([]);
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
    });

    it('stops and restarts one timer when hidden monitors change', () => {
        pointerVisibility.setHiddenMonitors(['0']);
        pointerVisibility.setHiddenMonitors(['0', '1']);
        expect(mocks.timeoutAdd).toHaveBeenCalledOnce();
        pointerVisibility.setHiddenMonitors([]);
        expect(mocks.sourceRemove).toHaveBeenCalledExactlyOnceWith(1);
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
        pointerVisibility.setHiddenMonitors(['0']);
        expect(mocks.timeoutAdd).toHaveBeenCalledTimes(2);
        expect(mocks.inhibit).toHaveBeenCalledTimes(2);
    });

    it('uses exclusive right and bottom monitor boundaries', () => {
        pointerVisibility.setHiddenMonitors(['0']);
        mocks.pointer = [100, 10];
        mocks.tick?.();
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
        mocks.pointer = [10, 100];
        mocks.tick?.();
        expect(mocks.inhibit).toHaveBeenCalledOnce();
    });

    it('handles overlays whose monitor geometry is no longer available', () => {
        pointerVisibility.setHiddenMonitors(['2']);
        expect(() => mocks.tick?.()).not.toThrow();
        expect(mocks.inhibit).not.toHaveBeenCalled();
    });

    it('restores visibility if an inhibited monitor disappears or has no index', () => {
        pointerVisibility.setHiddenMonitors(['0']);
        mocks.resolveIndex.mockReset();
        mocks.tick?.();
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
        expect(mocks.inhibit).toHaveBeenCalledOnce();
    });

    it('includes left and top boundaries for monitors at negative coordinates', () => {
        const monitor = mocks.monitors[0];
        const original = { ...monitor };
        try {
            monitor.x = -100;
            monitor.y = -100;
            mocks.pointer = [-100, -100];
            pointerVisibility.setHiddenMonitors(['0']);
            expect(mocks.inhibit).toHaveBeenCalledOnce();
            mocks.pointer = [-101, -100];
            mocks.tick?.();
            expect(mocks.uninhibit).toHaveBeenCalledOnce();
            mocks.pointer = [-100, -101];
            mocks.tick?.();
            expect(mocks.inhibit).toHaveBeenCalledOnce();
        } finally {
            Object.assign(monitor, original);
        }
    });

    it('releases its inhibition and removes the timer on disable only once', () => {
        pointerVisibility.setHiddenMonitors(['0']);
        pointerVisibility.dispose();
        pointerVisibility.dispose();
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
        expect(mocks.sourceRemove).toHaveBeenCalledExactlyOnceWith(1);
    });
});
