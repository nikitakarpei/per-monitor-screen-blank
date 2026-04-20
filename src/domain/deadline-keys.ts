/**
 * Keys for {@link DeadlineScheduler} (must match scheduler + engine usage).
 * Single source — do not duplicate string literals elsewhere.
 */
export const DEADLINE_KEYS = {
    autoBlack: 'auto-black',
    keepAwakeExpiry: 'keep-awake-expiry',
} as const;

export type DeadlineKey = (typeof DEADLINE_KEYS)[keyof typeof DEADLINE_KEYS];
