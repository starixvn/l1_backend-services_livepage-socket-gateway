import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { LoggerModule } from "../common/logger.module";
import { EventsController } from "./events.controller";
import { EventsGateway } from "./events.gateway";

describe("EventsController", () => {
    let eventsController: EventsController;
    let eventsGateway: EventsGateway;
    let configService: ConfigService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [ConfigModule, LoggerModule],
            controllers: [EventsController],
            providers: [EventsGateway],
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
