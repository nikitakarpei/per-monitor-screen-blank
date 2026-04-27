import { type IssueReport, type LoggerPort } from '@pmsb/application';

type IssueReporter = (issue: IssueReport) => void;

export class GjsLogger implements LoggerPort {
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
