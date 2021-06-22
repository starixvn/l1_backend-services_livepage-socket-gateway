import { Module } from "@nestjs/common";

import { EventsController } from "./events.controller";
import { EventsGateway } from "./events.gateway";

@Module({ 
    providers: [EventsGateway], 
    controllers: [EventsController]
})
    
export class EventsModule {}
