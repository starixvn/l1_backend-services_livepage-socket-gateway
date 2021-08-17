import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "src/common/logger.module";

import { EventsController } from "./events.controller";
import { EventsGateway } from "./events.gateway";

@Module({
    imports: [ConfigModule, LoggerModule],
    providers: [EventsGateway],
    controllers: [EventsController],
})
export class EventsModule {}
