export interface IssueReport {
    level: 'warn' | 'error';
    message: string;
}

export interface LoggerPort {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}
