import { Injectable, LoggerService, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { captureException, captureMessage, init } from "@sentry/node";

@Injectable({ scope: Scope.DEFAULT })
export class CustomLogger implements LoggerService {
    constructor(private readonly configService: ConfigService) {
        init({ dsn: this.configService.get<string>("sentry.dsn"), environment: this.configService.get<string>("sentry.env") });
        captureMessage(`Logger started at ${new Date()}`);
    }

    log(message: any, ...optionalParams: any[]) {
        captureMessage(this.formatMessage(message, optionalParams));
    }

    error(message: any) {
        captureException(message);
    }

    warn(message: any, ...optionalParams: any[]) {
        captureMessage(this.formatMessage(message, optionalParams));
    }

    formatMessage(message: any, optionalParams: any[]): string {
        const paramsString = optionalParams?.length > 0 ? JSON.stringify(optionalParams) : "";

        return paramsString !== "" ? `${message}. Params: ${paramsString}` : message;
    }
}
