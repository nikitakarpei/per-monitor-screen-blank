// Ambient declarations so tsc resolves GJS imports without full GObject-introspection types.
// All gi:// and resource:// modules resolve to `any`; type narrowing can be added per-module later.

declare module 'gi://*';
declare module 'resource://*';

declare const global: unknown;
declare function log(message: string): void;
declare function logError(error: unknown, prefix?: string): void;
declare const imports: unknown;
