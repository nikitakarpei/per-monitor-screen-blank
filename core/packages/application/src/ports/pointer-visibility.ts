export interface PointerVisibility {
    /** Hide only while the pointer is within one of these monitors. */
    setHiddenMonitors(monitorIds: readonly string[]): void;
}
