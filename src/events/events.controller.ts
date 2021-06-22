import { Controller, Get } from "@nestjs/common";
import * as prometheus from "socket.io-prometheus-metrics";

import { EventsGateway } from "./events.gateway";

@Controller('events')
export class EventsController {
    constructor(private readonly eventGateWay: EventsGateway) {}

    @Get('metrics')
    getSocketMetrics(): prometheus.SocketIOMetrics {
        return this.eventGateWay.getSocketMetrics();
    }
}
