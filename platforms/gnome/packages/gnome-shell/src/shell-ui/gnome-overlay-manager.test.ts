import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GnomeOverlayManager } from './gnome-overlay-manager.js';

const mocks = vi.hoisted(() => ({
    inhibit: vi.fn(),
    uninhibit: vi.fn(),
    pointer: [10, 10],
    tick: undefined as (() => boolean) | undefined,
    timeoutAdd: vi.fn(),
    sourceRemove: vi.fn(),
    monitors: [
        { x: 0, y: 0, width: 100, height: 100 },
        { x: 100, y: 0, width: 100, height: 100 },
    ],
}));

vi.mock('gi://Clutter', () => ({
    default: {
        BinLayout: class {},
        AnimationMode: { EASE_IN_QUAD: 1, EASE_OUT_QUAD: 2 },
    },
}));
vi.mock('gi://GLib', () => ({
    default: {
        PRIORITY_DEFAULT: 0,
        SOURCE_CONTINUE: true,
        timeout_add: mocks.timeoutAdd,
        Source: { remove: mocks.sourceRemove },
    },
}));
vi.mock('gi://St', () => ({
    default: {
        Widget: class {
            hide = vi.fn();
            show = vi.fn();
            add_constraint = vi.fn();
            destroy = vi.fn();
            ease(options: { onComplete?: () => void }): void {
                options.onComplete?.();
            }
        },
    },
}));
vi.mock('resource:///org/gnome/shell/misc/config.js', () => ({
    PACKAGE_VERSION: '49',
}));
vi.mock('resource:///org/gnome/shell/ui/layout.js', () => ({
    MonitorConstraint: class {},
}));
vi.mock('resource:///org/gnome/shell/ui/main.js', () => ({
    layoutManager: {
        monitors: mocks.monitors,
        addChrome: vi.fn(),
        removeChrome: vi.fn(),
    },
}));

function createManager(): GnomeOverlayManager {
    return new GnomeOverlayManager(
        { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        {
            getIndexByMonitorId: Number,
            tryGetIndexByMonitorId: Number,
            getMonitorIdByIndex: String,
            tryGetMonitorIdByIndex: String,
        },
        { emit: vi.fn() },
    );
}

describe('cursor visibility over monitor overlays', () => {
    let manager: GnomeOverlayManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.pointer = [10, 10];
        mocks.tick = undefined;
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
        manager = createManager();
        manager.setDimIntensityPercent(100);
    });

    afterEach(() => {
        manager.dispose();
        vi.unstubAllGlobals();
    });

    it('does not poll while no monitor is fully blanked', () => {
        expect(mocks.timeoutAdd).not.toHaveBeenCalled();
        manager.setDimIntensityPercent(50);
        manager.showForMonitor('0');
        expect(mocks.timeoutAdd).not.toHaveBeenCalled();
    });

    it('hides the cursor when its monitor blanks and restores it on wake', () => {
        manager.showForMonitor('0');
        expect(mocks.inhibit).toHaveBeenCalledExactlyOnceWith();
        manager.hideForMonitor('0');
        expect(mocks.uninhibit).toHaveBeenCalledExactlyOnceWith();
    });

    it('leaves the cursor visible when another monitor blanks', () => {
        manager.showForMonitor('1');
        expect(mocks.inhibit).not.toHaveBeenCalled();
    });

    it('updates when the pointer enters and leaves a manually blanked monitor', () => {
        manager.showForMonitor('1');
        mocks.pointer = [110, 10];
        expect(mocks.tick?.()).toBe(true);
        expect(mocks.inhibit).toHaveBeenCalledOnce();
        mocks.pointer = [10, 10];
        mocks.tick?.();
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
    });

    it('pairs inhibition once even with multiple overlays and repeated samples', () => {
        manager.showForMonitor('0');
        manager.showForMonitor('1');
        mocks.tick?.();
        mocks.pointer = [110, 10];
        mocks.tick?.();
        manager.hideForMonitor('0');
        expect(mocks.inhibit).toHaveBeenCalledOnce();
        expect(mocks.uninhibit).not.toHaveBeenCalled();
        manager.hideForMonitor('1');
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
    });

    it('does not hide the cursor for dimming and reacts to intensity changes', () => {
        manager.setDimIntensityPercent(50);
        manager.showForMonitor('0');
        expect(mocks.inhibit).not.toHaveBeenCalled();
        manager.setDimIntensityPercent(100);
        expect(mocks.inhibit).toHaveBeenCalledOnce();
        manager.setDimIntensityPercent(50);
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
    });

    it('uses exclusive right and bottom monitor boundaries', () => {
        manager.showForMonitor('0');
        mocks.pointer = [100, 10];
        mocks.tick?.();
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
        mocks.pointer = [10, 100];
        mocks.tick?.();
        expect(mocks.inhibit).toHaveBeenCalledOnce();
    });

    it('handles overlays whose monitor geometry is no longer available', () => {
        manager.showForMonitor('2');
        expect(() => mocks.tick?.()).not.toThrow();
        expect(mocks.inhibit).not.toHaveBeenCalled();
    });

    it('releases its inhibition and removes the timer on disable only once', () => {
        manager.showForMonitor('0');
        manager.dispose();
        manager.dispose();
        expect(mocks.uninhibit).toHaveBeenCalledOnce();
        expect(mocks.sourceRemove).toHaveBeenCalledExactlyOnceWith(1);
    });
});
