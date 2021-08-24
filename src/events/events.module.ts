import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CommonModule } from "../common/common.module";
import { EventsController } from "./events.controller";
import { EventsGateway } from "./events.gateway";

@Module({
    imports: [ConfigModule, CommonModule],
    providers: [EventsGateway],
    controllers: [EventsController],
})
export class EventsModule {}
