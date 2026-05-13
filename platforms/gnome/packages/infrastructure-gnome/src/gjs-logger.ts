import type { LoggerPort } from '@pmsb/application';

export class GjsLogger implements LoggerPort {
    constructor(private readonly prefix: string) {}

    info(message: string): void {
        globalThis.console.debug(`${this.prefix} INFO: ${message}`);
    }

    warn(message: string): void {
        globalThis.console.debug(`${this.prefix} WARN: ${message}`);
    }

    error(message: string, exception?: object): void {
        if (exception) {
            globalThis.console.error(
                `${this.prefix} ERROR: ${message}`,
                exception,
            );
        } else {
            globalThis.console.error(`${this.prefix} ERROR: ${message}`);
        }
    }
}
