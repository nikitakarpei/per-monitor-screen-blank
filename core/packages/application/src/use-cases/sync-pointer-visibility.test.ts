import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonitorState } from '@pmsb/domain';
import type { PlatformEventSubscriber } from '../ports/platform-events.js';
import { AppEventBus } from '../services/app-event-bus.js';
import { FocusedMonitorService } from '../services/focused-monitor-service.js';
import { MonitorRegistry } from '../services/monitor-registry.js';
import type { LoggerPort } from '../util/logger.js';
import { syncPointerVisibility } from './sync-pointer-visibility.js';
import type { SyncPointerVisibilityDeps } from './sync-pointer-visibility.js';

function noop(): void {
    /* no-op */
}

function createNoOpPlatformSubscriber(): PlatformEventSubscriber {
    return {
        on: vi.fn(() => noop),
        onAny: vi.fn(() => noop),
    };
}

describe('syncPointerVisibility', () => {
    let logger: LoggerPort;
    let bus: AppEventBus;
    let monitorRegistry: MonitorRegistry;
    let pointerMonitorId: string;
    let dimIntensity: number;
    let setHidden: ReturnType<typeof vi.fn<(hidden: boolean) => void>>;
    let deps: SyncPointerVisibilityDeps;

    function givenMonitor(monitorId: string, state: MonitorState): void {
        monitorRegistry.create(monitorId);
        monitorRegistry.transitionState(monitorId, state, 'test-setup');
    }

    beforeEach(() => {
        logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        bus = new AppEventBus(logger, createNoOpPlatformSubscriber());
        monitorRegistry = new MonitorRegistry(logger, bus);
        pointerMonitorId = 'monitor-a';
        dimIntensity = 100;
        setHidden = vi.fn<(hidden: boolean) => void>();
        deps = {
            focusedMonitorService: new FocusedMonitorService(
                {
                    getPointerPosition: () => ({
                        x: 0,
                        y: 0,
                        monitorId: pointerMonitorId,
                    }),
                },
                monitorRegistry,
            ),
            generalSettings: { getDimIntensity: () => dimIntensity },
            pointerVisibility: { setHidden },
            logger,
        };
    });

    afterEach(() => {
        monitorRegistry.dispose();
        bus.dispose();
    });

    it.each<MonitorState>(['ManualBlack', 'AutoBlack'])(
        'hides the pointer over a fully black %s monitor',
        (state) => {
            givenMonitor('monitor-a', state);

            syncPointerVisibility(deps);

            expect(setHidden).toHaveBeenCalledExactlyOnceWith(true);
        },
    );

    it.each<MonitorState>(['AutoAwake', 'AutoPaused', 'KeepAwake', 'Disabled'])(
        'keeps the pointer visible over an awake %s monitor',
        (state) => {
            givenMonitor('monitor-a', state);

            syncPointerVisibility(deps);

            expect(setHidden).toHaveBeenCalledExactlyOnceWith(false);
        },
    );

    it('keeps the pointer visible over a dimmed (not fully black) monitor', () => {
        givenMonitor('monitor-a', 'ManualBlack');
        dimIntensity = 99;

        syncPointerVisibility(deps);

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(false);
    });

    it('normalizes out-of-range intensity the same way as the overlay', () => {
        givenMonitor('monitor-a', 'ManualBlack');
        dimIntensity = 150;

        syncPointerVisibility(deps);

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(true);
    });

    it('follows the pointer to whichever monitor it is on', () => {
        givenMonitor('monitor-a', 'KeepAwake');
        givenMonitor('monitor-b', 'ManualBlack');

        syncPointerVisibility(deps);
        pointerMonitorId = 'monitor-b';
        syncPointerVisibility(deps);
        pointerMonitorId = 'monitor-a';
        syncPointerVisibility(deps);

        expect(setHidden.mock.calls).toEqual([[false], [true], [false]]);
    });

    it('restores the pointer and logs when it is not on a managed monitor', () => {
        givenMonitor('monitor-a', 'ManualBlack');
        monitorRegistry.remove('monitor-a');

        syncPointerVisibility(deps);

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(false);
        expect(logger.info).toHaveBeenLastCalledWith(
            expect.stringContaining('not on a managed monitor'),
        );
    });
});
