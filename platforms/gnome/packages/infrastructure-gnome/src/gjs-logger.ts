import type { LoggerPort } from '@pmsb/application';

export class GjsLogger implements LoggerPort {
    constructor(private readonly prefix: string) {}

    info(message: string): void {
        console.log(`${this.prefix} INFO: ${message}`);
    }

    warn(message: string): void {
        console.warn(`${this.prefix} WARN: ${message}`);
    }

    error(message: string, exception?: object): void {
        if (exception) {
            console.error(`${this.prefix} ERROR: ${message}`, exception);
        } else {
            console.error(`${this.prefix} ERROR: ${message}`);
        }
    }
}
