export interface PointerVisibility {
    /** Hides or restores the pointer. Repeated calls with the same value are no-ops. */
    setHidden(hidden: boolean): void;
}
