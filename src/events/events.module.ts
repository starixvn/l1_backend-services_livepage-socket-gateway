import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CommonModule } from "../common/common.module";
import { EventsController } from "./events.controller";
import { EventsGateway } from "./events.gateway";
import { ClientConnectionService, PlayConnectionService, ViewConnectionService } from "./connections";

@Module({
    imports: [ConfigModule, CommonModule],
    providers: [EventsGateway, ClientConnectionService, PlayConnectionService, ViewConnectionService],
    controllers: [EventsController],
})
export class EventsModule {}
