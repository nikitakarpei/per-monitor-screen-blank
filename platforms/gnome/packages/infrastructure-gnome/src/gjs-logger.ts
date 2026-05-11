import type { LoggerPort } from '@pmsb/application';

export class GjsLogger implements LoggerPort {
    constructor(private readonly prefix: string) {}

    info(message: string) {
        log(`${this.prefix} INFO: ${message}`);
    }

    warn(message: string) {
        log(`${this.prefix} WARN: ${message}`);
    }

    error(message: string, exception?: object) {
        if (exception) {
            logError(exception, `${this.prefix} ERROR: ${message}`);
        } else {
            logError(`${this.prefix} ERROR: ${message}`);
        }
    }
}
