import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    PlatformEvent,
    PlatformEventSubscriber,
} from '../../ports/platform-events.js';
import { AppEventBus } from '../../services/app-event-bus.js';
import { EventBus } from '../../util/event-bus.js';
import { registerPointerVisibilityHandlers } from './handle-pointer-visibility.js';

describe('pointer visibility application handlers', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    let platformBus: EventBus<PlatformEvent>;
    let bus: AppEventBus;
    let intensity: number;
    const setHiddenMonitors = vi.fn();
    const show = (monitorId: string) =>
        platformBus.emit({
            type: 'overlay-shown',
            payload: { monitorId, monitorIndex: 0 },
        });
    const hide = (monitorId: string) =>
        platformBus.emit({ type: 'overlay-hidden', payload: { monitorId } });
    const dim = (percent: number) => {
        intensity = percent;
        platformBus.emit({
            type: 'dim-intensity-changed',
            payload: { percent },
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        intensity = 100;
        platformBus = new EventBus(logger);
        const on: PlatformEventSubscriber['on'] = (type, callback) =>
            platformBus.on(type, callback as (payload: object) => void);
        bus = new AppEventBus(logger, {
            on,
            onAny: (callback) => platformBus.onAny(callback),
        });
        registerPointerVisibilityHandlers({
            bus,
            generalSettings: { getDimIntensity: () => intensity },
            pointerVisibility: { setHiddenMonitors },
        });
    });
    afterEach(() => {
        bus.dispose();
        platformBus.dispose();
    });

    it('tracks actual overlays and restores on wake', () => {
        show('a');
        expect(setHiddenMonitors).toHaveBeenLastCalledWith(['a']);
        show('b');
        expect(setHiddenMonitors).toHaveBeenLastCalledWith(['a', 'b']);
        hide('a');
        expect(setHiddenMonitors).toHaveBeenLastCalledWith(['b']);
        hide('b');
        expect(setHiddenMonitors).toHaveBeenLastCalledWith([]);
    });

    it('keeps dimmed overlays visible and reacts to intensity changes without losing overlays', () => {
        dim(50);
        show('a');
        expect(setHiddenMonitors).toHaveBeenLastCalledWith([]);
        dim(100);
        expect(setHiddenMonitors).toHaveBeenLastCalledWith(['a']);
        dim(99.9);
        expect(setHiddenMonitors).toHaveBeenLastCalledWith([]);
        hide('a');
        dim(100);
        expect(setHiddenMonitors).toHaveBeenLastCalledWith([]);
    });

    it('normalizes intensity the same way as the overlay', () => {
        dim(101);
        show('a');
        expect(setHiddenMonitors).toHaveBeenLastCalledWith(['a']);
    });

    it('resynchronizes overlays shown before settings bootstrap', () => {
        show('a');
        intensity = 50;
        platformBus.emit({
            type: 'application-bootstrap-requested',
            payload: {},
        });
        expect(setHiddenMonitors).toHaveBeenLastCalledWith([]);
    });

    it('removes disconnected monitors even before overlay cleanup', () => {
        show('a');
        show('b');
        platformBus.emit({
            type: 'monitor-disconnected',
            payload: { monitorId: 'a' },
        });
        expect(setHiddenMonitors).toHaveBeenLastCalledWith(['b']);
        hide('a');
        expect(setHiddenMonitors).toHaveBeenLastCalledWith(['b']);
    });

    it('deduplicates overlay events and releases subscriptions with the app bus', () => {
        show('a');
        show('a');
        expect(setHiddenMonitors).toHaveBeenLastCalledWith(['a']);
        bus.dispose();
        setHiddenMonitors.mockClear();
        show('b');
        dim(50);
        expect(setHiddenMonitors).not.toHaveBeenCalled();
    });
});
