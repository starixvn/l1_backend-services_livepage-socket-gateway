import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ExceptionsFilter } from "./exceptions.filter";
import { CustomLogger } from "./logger.service";

@Module({
    imports: [ConfigModule],
    providers: [CustomLogger, ExceptionsFilter],
    exports: [CustomLogger, ExceptionsFilter],
})
export class CommonModule {}
