export interface IssueReport {
    level: 'warn' | 'error';
    message: string;
}

type IssueReporter = (issue: IssueReport) => void;

/** Public interface of Logger for typing and mocking purposes */
export interface LoggerPort {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

export class Logger implements LoggerPort {
    constructor(
        private readonly prefix: string,
        private readonly issueReporter?: IssueReporter,
    ) {}

    info(message: string) {
        log(`${this.prefix} INFO: ${message}`);
    }

    warn(message: string) {
        log(`${this.prefix} WARN: ${message}`);

        if (this.issueReporter) {
            this.issueReporter({
                level: 'warn',
                message,
            });
        }
    }

    error(message: string) {
        logError(new Error(`${this.prefix} ERROR: ${message}`));

        if (this.issueReporter) {
            this.issueReporter({
                level: 'error',
                message,
            });
        }
    }
}
