import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEADLINE_KEYS } from '@pmsb/domain';
import type { MonitorState } from '@pmsb/domain';
import type { DeadlineScheduler } from '../../ports/scheduler.js';
import { AppEventBus } from '../../services/app-event-bus.js';
import { FocusedMonitorService } from '../../services/focused-monitor-service.js';
import { MonitorRegistry } from '../../services/monitor-registry.js';
import type { LoggerPort } from '../../util/logger.js';
import { pointerVisibilityControl } from './pointer-visibility-control.js';

function noop(): void {
    /* no-op */
}

describe('pointerVisibilityControl', () => {
    let logger: LoggerPort;
    let bus: AppEventBus;
    let monitorRegistry: MonitorRegistry;
    const setHidden = vi.fn<(hidden: boolean) => void>();
    const tryCancel = vi.fn<DeadlineScheduler['tryCancel']>(() => true);
    let deps: Parameters<typeof pointerVisibilityControl>[0];

    function transition(
        monitorId: string,
        previous: MonitorState | undefined,
        current: MonitorState,
    ): void {
        if (!monitorRegistry.has(monitorId)) {
            monitorRegistry.create(monitorId);
        }
        monitorRegistry.transitionState(monitorId, current, 'test-setup');
        pointerVisibilityControl(deps, {
            monitorId,
            previous,
            current,
            reason: 'test',
        });
    }

    beforeEach(() => {
        vi.clearAllMocks();
        logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
        bus = new AppEventBus(logger, {
            on: vi.fn(() => noop),
            onAny: vi.fn(() => noop),
        });
        monitorRegistry = new MonitorRegistry(logger, bus);
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
            generalSettings: { getDimIntensity: () => 100 },
            pointerVisibility: { setHidden },
            deadlineScheduler: {
                schedule: vi.fn(),
                cancel: vi.fn(),
                tryCancel,
                cancelMonitor: vi.fn(),
            },
            logger,
        };
    });

    afterEach(() => {
        monitorRegistry.dispose();
        bus.dispose();
    });

    it('hides the pointer immediately when its own monitor blanks', () => {
        transition('monitor-a', 'AutoPaused', 'ManualBlack');

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(true);
        expect(tryCancel).not.toHaveBeenCalled();
    });

    it('restores the pointer and cancels the pending hide when its monitor wakes', () => {
        transition('monitor-a', 'ManualBlack', 'KeepAwake');

        expect(setHidden).toHaveBeenCalledExactlyOnceWith(false);
        expect(tryCancel).toHaveBeenCalledExactlyOnceWith(
            DEADLINE_KEYS.pointerHide,
            'monitor-a',
        );
    });

    it('cancels the pending hide of another monitor without touching the pointer', () => {
        transition('monitor-b', 'AutoBlack', 'AutoAwake');

        expect(tryCancel).toHaveBeenCalledExactlyOnceWith(
            DEADLINE_KEYS.pointerHide,
            'monitor-b',
        );
        expect(setHidden).not.toHaveBeenCalled();
    });

    it('leaves the pointer and its grace period alone when another monitor blanks', () => {
        transition('monitor-b', 'AutoAwake', 'AutoBlack');

        expect(setHidden).not.toHaveBeenCalled();
        expect(tryCancel).not.toHaveBeenCalled();
    });
});
