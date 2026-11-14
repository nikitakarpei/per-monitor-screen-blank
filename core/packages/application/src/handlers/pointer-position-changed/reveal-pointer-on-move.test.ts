import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEADLINE_KEYS, POINTER_HIDE_DELAY_MS } from '@pmsb/domain';
import type { MonitorState } from '@pmsb/domain';
import type { DeadlineScheduler } from '../../ports/scheduler.js';
import { AppEventBus } from '../../services/app-event-bus.js';
import { FocusedMonitorService } from '../../services/focused-monitor-service.js';
import { MonitorRegistry } from '../../services/monitor-registry.js';
import type { LoggerPort } from '../../util/logger.js';
import { revealPointerOnMove } from './reveal-pointer-on-move.js';

const NOW = 1_000_000;

function noop(): void {
    /* no-op */
}

describe('revealPointerOnMove', () => {
    let logger: LoggerPort;
    let bus: AppEventBus;
    let monitorRegistry: MonitorRegistry;
    let dimIntensity: number;
    const setHidden = vi.fn<(hidden: boolean) => void>();
    const schedule = vi.fn<DeadlineScheduler['schedule']>();
    let deps: Parameters<typeof revealPointerOnMove>[0];

    function givenPointerOn(state: MonitorState): void {
        monitorRegistry.create('monitor-a');
        monitorRegistry.transitionState('monitor-a', state, 'test-setup');
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
        logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        bus = new AppEventBus(logger, {
            on: vi.fn(() => noop),
            onAny: vi.fn(() => noop),
        });
        monitorRegistry = new MonitorRegistry(logger, bus);
        dimIntensity = 100;
        deps = {
            focusedMonitorService: new FocusedMonitorService(
                {
                    getPointerPosition: () => ({
                        x: 0,
                        y: 0,
                        monitorId: 'monitor-a',
                    }),
                },
                monitorRegistry,
            ),
            generalSettings: { getDimIntensity: () => dimIntensity },
            pointerVisibility: { setHidden },
            deadlineScheduler: {
                schedule,
                cancel: vi.fn(),
                tryCancel: vi.fn(() => false),
                cancelMonitor: vi.fn(),
            },
            logger,
        };
    });

    afterEach(() => {
        monitorRegistry.dispose();
        bus.dispose();
        vi.restoreAllMocks();
    });

    it('shows the pointer and schedules hiding it on a fully black monitor', () => {
        givenPointerOn('ManualBlack');

        revealPointerOnMove(deps);

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(false);
        expect(schedule).toHaveBeenCalledExactlyOnceWith(
            DEADLINE_KEYS.pointerHide,
            'monitor-a',
            NOW + POINTER_HIDE_DELAY_MS,
        );
    });

    it('shows the pointer without scheduling on an awake monitor', () => {
        givenPointerOn('KeepAwake');

        revealPointerOnMove(deps);

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(false);
        expect(schedule).not.toHaveBeenCalled();
    });

    it('shows the pointer without scheduling on a dimmed monitor', () => {
        givenPointerOn('ManualBlack');
        dimIntensity = 60;

        revealPointerOnMove(deps);

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(false);
        expect(schedule).not.toHaveBeenCalled();
    });

    it('shows the pointer and logs when it is not on a managed monitor', () => {
        revealPointerOnMove(deps);

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(false);
        expect(schedule).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenLastCalledWith(
            expect.stringContaining('not on a managed monitor'),
        );
    });
});
