import { INestApplication } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { Test, TestingModule } from "@nestjs/testing";
import { SocketIoAdapter } from "../../src/adapters/socket.adapter";
import { ConfigModule, ConfigService } from "@nestjs/config";
import configurationTest from "../../src/config/configuration-test";
import { initUserServiceAPI } from "./stubs/user-service";
import { joinGameTests } from "./join-game.test";
import UserServiceClient from "../../src/common/user-service-client";
import { signInTests } from "./sign-in.test";
import { betTests } from "./bet.test";
import { outGameTests } from "./outGame.test";

jest.mock("socket.io-client");
jest.mock("socket.io-prom-metrics");
describe("GateWay integration tests", () => {
    let app: INestApplication;
    beforeAll(() => {
        initUserServiceAPI("http://user-service:5000");
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule.forRoot({ isGlobal: true, load: [configurationTest] }), AppModule],
        }).compile();
        const configService = module.get<ConfigService>(ConfigService);
        UserServiceClient.init(configService);
        app = module.createNestApplication();

        app.useWebSocketAdapter(new SocketIoAdapter(configService, app));
        await app.listen(5000);
    });

    afterEach(async () => {
        await app?.close();
        app = null;
    });

    joinGameTests();
    signInTests();
    betTests();
    outGameTests();
});
