import { LoggerService } from "@nestjs/common";
import * as Sentry from "@sentry/node";

export class CustomLogger implements LoggerService {
    constructor(dsn: string, env: string) {
        // Sentry.init({ dsn: this.configService.get<string>("sentry.dsn"), environment: this.configService.get<string>("sentry.env") });

        Sentry.init({ dsn, environment: env });
        Sentry.captureMessage(`Logger started at ${new Date()}`);
    }

    log(message: any, ...optionalParams: any[]) {
        Sentry.captureMessage(this.formatMessage(message, optionalParams));
    }

    error(message: any, ...optionalParams: any[]) {
        Sentry.captureException(message);
    }

    warn(message: any, ...optionalParams: any[]) {
        Sentry.captureMessage(this.formatMessage(message, optionalParams));
    }

    formatMessage(message: any, ...optionalParams: any[]): string {
        const paramsString = optionalParams?.length > 0 ? JSON.stringify(optionalParams) : "";

        return paramsString !== "" ? `${message}. Params: ${paramsString}` : message;
    }
}
