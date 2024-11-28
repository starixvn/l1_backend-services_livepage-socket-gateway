import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { CommonModule } from "../../../src/common/common.module";
import { EventsController } from "../../../src/events/events.controller";
import { EventsGateway } from "../../../src/events/events.gateway";
import { ClientConnectionService, PlayConnectionService, ViewConnectionService } from "../../../src/events/connections";
import configurationTest from "../../../src/config/configuration-test";

describe("EventsController", () => {
    let eventsController: EventsController;
    let eventsGateway: EventsGateway;
    let configService: ConfigService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ConfigModule.forRoot({ isGlobal: true, load: [configurationTest] }), CommonModule],
            controllers: [EventsController],
            providers: [EventsGateway, ClientConnectionService, PlayConnectionService, ViewConnectionService],
        }).compile();

        configService = moduleRef.get<ConfigService>(ConfigService);
        eventsGateway = moduleRef.get<EventsGateway>(EventsGateway);
        eventsController = moduleRef.get<EventsController>(EventsController);
    });

    describe("getSocketMetrics", () => {
        it("should return empty string if missing secret key", () => {
            // arrange
            const expectedResult = "";
            // act
            const actual = eventsController.getSocketMetrics("");

            // assert
            expect(actual).toBe(expectedResult);
        });

        it("should return empty string if incorrect secret key", () => {
            // arrange
            const expectedResult = "";
            jest.spyOn(eventsGateway, "getSocketMetrics").mockImplementation(() => "metrics");
            jest.spyOn(configService, "get").mockImplementation(() => "key");

            // act
            const actual = eventsController.getSocketMetrics("keyA");

            // assert
            expect(actual).toBe(expectedResult);
        });

        it("should return metrics if correct secret key", () => {
            // arrange
            const expectedResult = "metrics";
            jest.spyOn(eventsGateway, "getSocketMetrics").mockImplementation(() => expectedResult);
            jest.spyOn(configService, "get").mockImplementation(() => "key");

            // act
            const actual = eventsController.getSocketMetrics("key");

            // assert
            expect(actual).toBe(expectedResult);
        });
    });
});
