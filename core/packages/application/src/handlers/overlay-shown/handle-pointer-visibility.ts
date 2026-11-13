import { normalizeDimIntensityPercent } from '@pmsb/domain';
import type { GeneralSettings } from '../../ports/general-settings.js';
import type { PointerVisibility } from '../../ports/pointer-visibility.js';
import type { AppEventBus } from '../../services/app-event-bus.js';

interface PointerVisibilityDeps {
    bus: AppEventBus;
    generalSettings: Pick<GeneralSettings, 'getDimIntensity'>;
    pointerVisibility: PointerVisibility;
}

export function registerPointerVisibilityHandlers(
    deps: PointerVisibilityDeps,
): void {
    // Track actual overlays rather than desired monitor state. The bus owns
    // these subscriptions and releases them during application cleanup.
    const overlays = new Set<string>();
    const sync = () => {
        const fullyBlanked =
            normalizeDimIntensityPercent(
                deps.generalSettings.getDimIntensity(),
            ) === 100;
        deps.pointerVisibility.setHiddenMonitors(
            fullyBlanked ? [...overlays] : [],
        );
    };
    void deps.bus.on('overlay-shown', ({ monitorId }) => {
        void overlays.add(monitorId);
        sync();
    });
    const removeOverlay = ({ monitorId }: { monitorId: string }) => {
        void overlays.delete(monitorId);
        sync();
    };
    void deps.bus.on('overlay-hidden', removeOverlay);
    void deps.bus.on('monitor-disconnected', removeOverlay);
    void deps.bus.on('dim-intensity-changed', sync);
    // Overlays can be shown before general settings bootstrap sets opacity.
    void deps.bus.on('application-bootstrap-requested', sync);
}
