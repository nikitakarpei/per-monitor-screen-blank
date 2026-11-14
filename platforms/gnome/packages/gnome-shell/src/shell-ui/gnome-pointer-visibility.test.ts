import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GnomePointerVisibility } from './gnome-pointer-visibility.js';

describe('GnomePointerVisibility', () => {
    const inhibit = vi.fn();
    const uninhibit = vi.fn();
    let pointerVisibility: GnomePointerVisibility;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('global', {
            backend: {
                get_cursor_tracker: () => ({
                    inhibit_cursor_visibility: inhibit,
                    uninhibit_cursor_visibility: uninhibit,
                }),
            },
        });
        pointerVisibility = new GnomePointerVisibility();
    });

    afterEach(() => {
        pointerVisibility.dispose();
        vi.unstubAllGlobals();
    });

    it('inhibits on hide and uninhibits on restore', () => {
        pointerVisibility.setHidden(true);
        expect(inhibit).toHaveBeenCalledOnce();

        pointerVisibility.setHidden(false);
        expect(uninhibit).toHaveBeenCalledOnce();
    });

    it('holds at most one inhibition across repeated calls', () => {
        pointerVisibility.setHidden(true);
        pointerVisibility.setHidden(true);
        pointerVisibility.setHidden(false);
        pointerVisibility.setHidden(false);

        expect(inhibit).toHaveBeenCalledOnce();
        expect(uninhibit).toHaveBeenCalledOnce();
    });

    it('never uninhibits what it did not inhibit', () => {
        pointerVisibility.setHidden(false);
        pointerVisibility.dispose();

        expect(uninhibit).not.toHaveBeenCalled();
    });

    it('releases its inhibition on dispose exactly once', () => {
        pointerVisibility.setHidden(true);
        pointerVisibility.dispose();
        pointerVisibility.dispose();

        expect(uninhibit).toHaveBeenCalledOnce();
    });
});
