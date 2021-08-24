import { ArgumentsHost, Catch } from "@nestjs/common";
import { BaseWsExceptionFilter } from "@nestjs/websockets";

import { CustomLogger } from "./logger.service";

@Catch()
export class ExceptionsFilter extends BaseWsExceptionFilter {
    constructor(private readonly logService: CustomLogger) {
        super();
    }

    catch(exception: unknown, host: ArgumentsHost) {
        super.catch(exception, host);

        this.logService.error(exception);
    }
}
