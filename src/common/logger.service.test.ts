import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { captureException, captureMessage } from "@sentry/node";

import { CustomLogger } from "./logger.service";

let logger: CustomLogger;
jest.mock("@sentry/node");

describe("CustomLogger", () => {
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule],
            providers: [CustomLogger],
        }).compile();

        logger = module.get<CustomLogger>(CustomLogger);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(logger).toBeDefined();
    });

    it("error should exec captureException", () => {
        // act
        logger.error("");

        // assert
        expect(captureException).toHaveBeenCalled();
    });

    it("log should exec captureMessage", () => {
        // act
        logger.log("");

        // assert
        expect(captureMessage).toHaveBeenCalled();
    });

    it("log should exec captureMessage with formatted params", () => {
        // arrange
        const params = ["game", 23];
        const paramsString = JSON.stringify(params);

        // act
        logger.log("info", "game", 23);

        // assert
        expect(captureMessage).toHaveBeenLastCalledWith(`info. Params: ${paramsString}`);
    });

    it("warn should exec captureMessage", () => {
        // act
        logger.warn("");

        // assert
        expect(captureMessage).toHaveBeenCalled();
    });
});
