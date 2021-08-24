import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { CommonModule } from "../common/common.module";
import { EventsGateway } from "./events.gateway";

let gateway: EventsGateway;

beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
        imports: [ConfigModule, CommonModule],
        providers: [EventsGateway],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
});

afterEach(() => {
    jest.clearAllMocks();
});

describe("EventsGateway", () => {
    it("should be defined", () => {
        expect(gateway).toBeDefined();
    });
});
