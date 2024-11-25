import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ExceptionsFilter } from "./exceptions.filter";
import { CustomLogger } from "./logger.service";
import { UserService } from "./user.service";

@Module({
    imports: [ConfigModule],
    providers: [CustomLogger, ExceptionsFilter, UserService],
    exports: [CustomLogger, ExceptionsFilter, UserService],
})
export class CommonModule {}
