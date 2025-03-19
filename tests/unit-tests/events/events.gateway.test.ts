import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { CommonModule } from "../../../src/common/common.module";
import { EventsGateway } from "../../../src/events/events.gateway";
import { ClientConnectionService, PlayConnectionService, ViewConnectionService } from "../../../src/events/connections";
import { UserService } from "../../../src/common/user.service";
import configurationTest from "../../../src/config/configuration-test";
import { CustomLogger } from "../../../src/common/logger.service";

describe("EventsGateway", () => {
    let gateway: EventsGateway;
    let viewConnectionService: ViewConnectionService;
    let playConnectionService: PlayConnectionService;
    let clientConnectionService: ClientConnectionService;
    let userService: UserService;
    let logService: CustomLogger;
    jest.useFakeTimers();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule.forRoot({ isGlobal: true, load: [configurationTest] }), CommonModule],
            providers: [EventsGateway, ClientConnectionService, PlayConnectionService, ViewConnectionService],
        }).compile();

        logService = module.get(CustomLogger);
        viewConnectionService = module.get(ViewConnectionService);
        playConnectionService = module.get(PlayConnectionService);
        clientConnectionService = module.get(ClientConnectionService);
        userService = module.get(UserService);
        gateway = module.get<EventsGateway>(EventsGateway);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(gateway).toBeDefined();
    });

    describe("handleConnection", () => {
        it("should init client connection & play connection", () => {
            // arrange
            clientConnectionService.init = jest.fn();
            playConnectionService.init = jest.fn();

            // act
            gateway.handleConnection({ id: "asd" });

            // assert
            expect(clientConnectionService.init).toHaveBeenCalledWith("asd");
            expect(playConnectionService.init).toHaveBeenCalledWith("asd");
        });
    });

    describe("handleDisconnect", () => {
        it("should disconnect client & play connection", () => {
            // arrange
            clientConnectionService.disconnect = jest.fn();
            playConnectionService.disconnect = jest.fn();

            // act
            gateway.handleDisconnect({ id: "asd" });

            // assert
            expect(clientConnectionService.disconnect).toHaveBeenCalledWith("asd");
            expect(playConnectionService.disconnect).toHaveBeenCalledWith("asd");
        });
    });

    describe("joinGame", () => {
        describe("invalid data", () => {
            const clientSocket = { id: "asd", request: { headers: { ["user-agent"]: "useragent" } } };

            it("should do nothing when not exist gameName", async () => {
                // arrange
                const data = { session: { ss: "123" } };
                userService.verifyUserSession = jest.fn();

                // act
                await gateway.joinGame(data, clientSocket);

                // assert
                expect(userService.verifyUserSession).not.toHaveBeenCalled();
            });
            it("should do nothing when not exist session", async () => {
                // arrange
                const data = { gameName: "SeDie" };
                userService.verifyUserSession = jest.fn();

                // act
                await gateway.joinGame(data, clientSocket);

                // assert
                expect(userService.verifyUserSession).not.toHaveBeenCalled();
            });
        });

        describe("valid data", () => {
            const data = { gameName: "SeDie", session: { ss: "123", username: "user" } };
            const clientSocket = { id: "asd", request: { headers: { ["user-agent"]: "useragent" } } };

            it("should emit unauthorize when invalid session", async () => {
                // arrange
                userService.verifyUserSession = jest.fn().mockReturnValueOnce(false);
                const client = { ...clientSocket, emit: jest.fn() };

                // act
                await gateway.joinGame(data, client);

                // assert
                expect(userService.verifyUserSession).toHaveBeenCalledWith(
                    data.session.ss,
                    data.session.username,
                    clientSocket.request.headers["user-agent"],
                );
                expect(client.emit).toHaveBeenCalledWith("message", { gameName: data.gameName, unauthorized: true });
            });

            it("should call viewConnectionService.inGame when view connection.connected = true", async () => {
                // arrange
                userService.verifyUserSession = jest.fn().mockReturnValueOnce(true);
                const viewConnection = { connected: true };
                viewConnectionService.getOrCreateSocket = jest.fn().mockReturnValueOnce(viewConnection);
                viewConnectionService.inGame = jest.fn();
                clientConnectionService.setSocket = jest.fn();

                // act
                await gateway.joinGame(data, clientSocket);

                // assert
                expect(viewConnectionService.getOrCreateSocket).toHaveBeenCalledWith(clientSocket, data);
                expect(clientConnectionService.setSocket).toHaveBeenCalledWith(clientSocket.id, data.gameName, clientSocket);
                expect(viewConnectionService.inGame).toHaveBeenCalledWith(clientSocket.id, data.gameName);
            });

            it("should not call viewConnectionService.inGame when view connection.connected = false", async () => {
                // arrange
                userService.verifyUserSession = jest.fn().mockReturnValueOnce(true);
                const viewConnection = { connected: false };
                viewConnectionService.getOrCreateSocket = jest.fn().mockReturnValueOnce(viewConnection);
                viewConnectionService.inGame = jest.fn();
                clientConnectionService.setSocket = jest.fn();

                // act
                await gateway.joinGame(data, clientSocket);

                // assert
                expect(viewConnectionService.inGame).not.toHaveBeenCalledWith();
            });

            it("should notify FailedConnectionErrorCode to client when cannot create socket", async () => {
                // arrange
                userService.verifyUserSession = jest.fn().mockReturnValueOnce(true);
                viewConnectionService.getOrCreateSocket = jest.fn().mockReturnValueOnce(null);
                logService.log = jest.fn();
                const client = { ...clientSocket, emit: jest.fn() };

                // act
                await gateway.joinGame(data, client);

                // assert
                expect(client.emit).toHaveBeenCalledWith(data.gameName, { errorCode: "SB0010" });
            });

            it("should log error when cannot create socket", async () => {
                // arrange
                userService.verifyUserSession = jest.fn().mockReturnValueOnce(true);
                viewConnectionService.getOrCreateSocket = jest.fn().mockReturnValueOnce(null);
                logService.log = jest.fn();
                const client = { ...clientSocket, emit: jest.fn() };

                // act
                await gateway.joinGame(data, client);

                // assert
                expect(logService.log).toHaveBeenCalledWith("Cannot open socket", [data.gameName, data.session.username]);
            });
        });
    });

    describe("signin", () => {
        const clientSocket = { id: "asd" };
        const session = { ss: "123", username: "user" };
        const gameName = "SeDie";
        describe("invalid data", () => {
            it("should do nothing when not exist gameName", () => {
                // arrange
                playConnectionService.getOrCreateSocket = jest.fn();

                // act
                gateway.signin({ session }, clientSocket);

                // assert
                expect(playConnectionService.getOrCreateSocket).not.toHaveBeenCalled();
            });

            it("should do nothing when not exist session", () => {
                // arrange
                playConnectionService.getOrCreateSocket = jest.fn();

                // act
                gateway.signin({ gameName }, clientSocket);

                // assert
                expect(playConnectionService.getOrCreateSocket).not.toHaveBeenCalled();
            });
        });

        describe("valid data", () => {
            const data = { gameName, session };
            it("should call playConnectionService.inGame when playerSocket.connected = true", () => {
                // arrange
                const playSocket = { connected: true };
                playConnectionService.getOrCreateSocket = jest.fn().mockReturnValueOnce(playSocket);
                playConnectionService.inGame = jest.fn();
                clientConnectionService.setSocket = jest.fn();

                // act
                gateway.signin(data, clientSocket);

                // assert
                expect(playConnectionService.getOrCreateSocket).toHaveBeenCalledWith(clientSocket, data);
                expect(clientConnectionService.setSocket).toHaveBeenLastCalledWith(clientSocket.id, data.gameName, clientSocket);
                expect(playConnectionService.inGame).toHaveBeenCalledWith(clientSocket.id, data.gameName);
            });

            it("should not call playConnectionService.inGame when playerSocket.connected = false", () => {
                // arrange
                const playSocket = { connected: false };
                playConnectionService.getOrCreateSocket = jest.fn().mockReturnValueOnce(playSocket);
                playConnectionService.inGame = jest.fn();
                clientConnectionService.setSocket = jest.fn();

                // act
                gateway.signin(data, clientSocket);

                // assert
                expect(playConnectionService.inGame).not.toHaveBeenCalled();
            });

            it("should notify FailedConnectionErrorCode to client when can not create play socket", () => {
                // arrange
                playConnectionService.getOrCreateSocket = jest.fn().mockReturnValueOnce(null);
                const client = { ...clientSocket, emit: jest.fn() };
                logService.log = jest.fn();

                // act
                gateway.signin(data, client);

                // assert
                expect(client.emit).toHaveBeenCalledWith(gameName, { errorCode: "SB0010" });
            });

            it("should log error when can not create play socket", () => {
                // arrange
                playConnectionService.getOrCreateSocket = jest.fn().mockReturnValueOnce(null);
                const client = { ...clientSocket, emit: jest.fn() };
                logService.log = jest.fn();

                // act
                gateway.signin(data, client);

                // assert
                expect(logService.log).toHaveBeenCalledWith("Cannot open socket", [gameName, data.session.username]);
            });
        });
    });

    describe("bet", () => {
        const gameName = "SeDie";
        const betData = {};
        const client = { id: "asd" };
        beforeEach(() => {
            playConnectionService.placeBet = jest.fn();
        });
        it("should do nothing when not exist gameName", () => {
            // act
            gateway.placingBet({ betData }, client);

            // assert
            expect(playConnectionService.placeBet).not.toHaveBeenCalled();
        });

        it("should do nothing when not exist betData", () => {
            // act
            gateway.placingBet({ gameName }, client);

            // assert
            expect(playConnectionService.placeBet).not.toHaveBeenCalled();
        });

        it("should call playConnectionService.placeBet when data is valid", () => {
            // arrange
            const data = { gameName, betData };

            // act
            gateway.placingBet(data, client);

            // assert
            expect(playConnectionService.placeBet).toHaveBeenCalledWith(client.id, data);
        });
    });

    describe("outGame", () => {
        const client = { id: "asd" };
        it("should return if gameName is empty", () => {
            // arrange
            playConnectionService.getSocket = jest.fn();

            // act
            gateway.outGame("", client);

            // assert
            expect(playConnectionService.getSocket).not.toHaveBeenCalled();
        });

        describe("when exist play socket", () => {
            const gameName = "gameName";
            it("should disconnect play socket", () => {
                // arrange
                const playSocket = { connected: true, disconnect: jest.fn() };
                playConnectionService.getSocket = jest.fn().mockReturnValueOnce(playSocket);
                playConnectionService.setSocket = jest.fn();
                clientConnectionService.setSocket = jest.fn();

                // act
                gateway.outGame(gameName, client);

                // assert
                expect(playSocket.disconnect).toHaveBeenCalled();
            });

            it("should set client socket = null", () => {
                // arrange
                const playSocket = { connected: true, disconnect: jest.fn() };
                playConnectionService.getSocket = jest.fn().mockReturnValueOnce(playSocket);
                playConnectionService.setSocket = jest.fn();
                clientConnectionService.setSocket = jest.fn();

                // act
                gateway.outGame(gameName, client);

                // assert
                expect(clientConnectionService.setSocket).toHaveBeenCalledWith(client.id, gameName, null);
            });

            it("should set play socket = null", () => {
                // arrange
                const playSocket = { connected: true, disconnect: jest.fn() };
                playConnectionService.getSocket = jest.fn().mockReturnValueOnce(playSocket);
                playConnectionService.setSocket = jest.fn();
                clientConnectionService.setSocket = jest.fn();

                // act
                gateway.outGame(gameName, client);

                // assert
                expect(playConnectionService.setSocket).toHaveBeenCalledWith(client.id, gameName, null);
            });
        });
    });
});
