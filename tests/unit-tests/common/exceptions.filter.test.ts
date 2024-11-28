import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { ExceptionsFilter } from "../../../src/common/exceptions.filter";
import { CustomLogger } from "../../../src/common/logger.service";

let filter: ExceptionsFilter;
let customLogger: CustomLogger;
const mockJson = jest.fn();
const mockStatus = jest.fn().mockImplementation(() => ({
    json: mockJson,
}));
const mockGetResponse = jest.fn().mockImplementation(() => ({
    status: mockStatus,
}));
const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
    getResponse: mockGetResponse,
    getRequest: jest.fn(),
}));
const mockClient = jest.fn().mockImplementation(() => ({
    emit: jest.fn(),
}));
const mockWsArgumentsHost = jest.fn().mockImplementation(() => ({
    getClient: mockClient,
    getData: jest.fn(),
}));
const mockArgumentsHost = {
    switchToHttp: mockHttpArgumentsHost,
    getArgByIndex: jest.fn(),
    getArgs: jest.fn(),
    getType: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: mockWsArgumentsHost,
};

describe("ExceptionsFilter", () => {
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule],
            providers: [ExceptionsFilter, CustomLogger],
        }).compile();

        customLogger = module.get<CustomLogger>(CustomLogger);
        filter = module.get<ExceptionsFilter>(ExceptionsFilter);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(filter).toBeDefined();
    });

    it("should log error when catch new exception", () => {
        // arrange
        jest.spyOn(customLogger, "error");

        // act
        filter.catch("error", mockArgumentsHost);

        // assert
        expect(customLogger.error).toHaveBeenCalled();
    });
});
