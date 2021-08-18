import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { LoggerModule } from "../common/logger.module";
import { EventsGateway } from "./events.gateway";

describe("EventsGateway", () => {
    let gateway: EventsGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule, LoggerModule],
            providers: [EventsGateway],
        }).compile();

        gateway = module.get<EventsGateway>(EventsGateway);
    });

    it("should be defined", () => {
        expect(gateway).toBeDefined();
    });
});
