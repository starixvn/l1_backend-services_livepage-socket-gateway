import { Actions, DataKeys, SocketEvents } from "../../../../src/events/connections/contants";
import { PlayConnectionService } from "../../../../src/events/connections";
import { io } from "socket.io-client";
import * as MsgpackParser from "socket.io-msgpack-parser";

jest.mock("socket.io-client", () => ({
    io: jest.fn(),
}));
jest.mock("socket.io-msgpack-parser", () => ({}));
describe(PlayConnectionService.name, () => {
    let playConnectionService: PlayConnectionService;
    const gameName = "gameName";
    beforeEach(() => {
        jest.useFakeTimers();
        const configService = { get: jest.fn().mockReturnValue({}) };
        const logService = { error: jest.fn() } as any;
        const clientConnectionService = { getSocket: jest.fn() };
        playConnectionService = new PlayConnectionService(configService as any, logService, clientConnectionService as any);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("get receivedEvents", () => {
        it("should return expected", () => {
            // act
            const actual = playConnectionService.receivedEvents;

            // assert
            expect(actual).toEqual([DataKeys.endBet, DataKeys.status]);
        });
    });

    describe("init", () => {
        it("should init socket = empty object", () => {
            // arrange
            const clientId = "asd";

            // act
            playConnectionService.init(clientId);

            // assert
            expect(playConnectionService["sockets"][clientId]).toEqual({});
        });
    });

    describe("inGame", () => {
        it("should call emitEvent with expected params", () => {
            // arrange
            const clientId = "asd";
            playConnectionService.emitEvent = jest.fn();

            // act
            playConnectionService.inGame(clientId, gameName);

            // assert
            expect(playConnectionService.emitEvent).toHaveBeenCalledWith(clientId, gameName, Actions.inGame, null);
        });
    });

    describe("placeBet", () => {
        it("should call emitEvent with expected params", () => {
            // arrange
            const clientId = "asd";
            const data = { gameName, betData: { amount: 10 } };
            playConnectionService.emitEvent = jest.fn();

            // act
            playConnectionService.placeBet(clientId, data);

            // assert
            expect(playConnectionService.emitEvent).toHaveBeenCalledWith(clientId, gameName, Actions.placeBet, data.betData);
        });
    });

    describe("disconnect", () => {
        it("should disconnect all play connection of player", () => {
            // arrange
            const clientId = "asd";
            const socket1 = { disconnect: jest.fn() };
            const socket2 = { disconnect: jest.fn() };
            playConnectionService.init(clientId);
            playConnectionService.setSocket(clientId, "game1", socket1 as any);
            playConnectionService.setSocket(clientId, "game2", socket2 as any);

            // act
            playConnectionService.disconnect(clientId);
            jest.runAllTimers();

            // assert
            expect(socket1.disconnect).toHaveBeenCalled();
            expect(socket2.disconnect).toHaveBeenCalled();
            expect(playConnectionService["sockets"][clientId]).toBeUndefined();
        });
    });

    describe("handleSocketEvents", () => {
        const registeredEvents = [
            SocketEvents.connect,
            gameName,
            SocketEvents.connectError,
            SocketEvents.disconnect,
            SocketEvents.signedIn,
            SocketEvents.message,
        ];
        it.each(registeredEvents)("should register expected event", (event) => {
            // arrange
            const clientId = "asd";
            const data = { gameName };
            const socket = { on: jest.fn() } as any;

            // act
            playConnectionService["handleSocketEvents"](clientId, data, socket);

            // assert
            expect(socket.on).toHaveBeenCalledWith(event, expect.any(Function));
        });
    });

    describe("onHandleGameData", () => {
        const clientId = "asd";
        describe("when data include gameConfigs", () => {
            const gameConfigs = { minBet: 10 };
            let clientSocket;
            beforeEach(() => {
                clientSocket = { emit: jest.fn() };
                (playConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce(clientSocket);
            });

            it("should publish gameConfigs when just signin", () => {
                // arrange
                const gameData = { gameConfigs, user: { name: "user" } };

                // act
                playConnectionService["onHandleGameData"](clientId, gameName, playConnectionService.receivedEvents, gameData);

                // assert
                expect(clientSocket.emit).toHaveBeenCalledWith(gameName, { gameConfigs });
            });

            it("should not publish when start new round", () => {
                // arrange
                const gameData = { gameConfigs, snr: true };

                // act
                playConnectionService["onHandleGameData"](clientId, gameName, playConnectionService.receivedEvents, gameData);

                // assert
                expect(clientSocket.emit).not.toHaveBeenCalled();
            });
        });

        describe("when gameData include key in receivedEvents", () => {
            const data = [{ [DataKeys.endBet]: 10 }, { [DataKeys.status]: { winAmount: 10 } }];
            let clientSocket;
            beforeEach(() => {
                clientSocket = { emit: jest.fn() };
                (playConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce(clientSocket);
            });
            it.each(data)("should publish data to client", (gameData) => {
                // act
                playConnectionService["onHandleGameData"](clientId, gameName, playConnectionService.receivedEvents, gameData);

                // assert
                expect(clientSocket.emit).toHaveBeenCalledWith(gameName, gameData);
            });
        });
        describe("when gameData not include key in receivedEvents", () => {
            let clientSocket;
            beforeEach(() => {
                clientSocket = { emit: jest.fn() };
                (playConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce(clientSocket);
            });
            it("should not publish data to client", () => {
                // arrange
                const gameData = { totalBet: {} };

                // act
                playConnectionService["onHandleGameData"](clientId, gameName, playConnectionService.receivedEvents, gameData);

                // assert
                expect(clientSocket.emit).not.toHaveBeenCalled();
            });
        });
    });

    describe("onHandleMessage", () => {
        it("should publish data to client", () => {
            // arrange
            const clientId = "asd";
            const clientSocket = { emit: jest.fn() };
            (playConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce(clientSocket);
            const gameData = { userStakeLevel: { minBet: 10 } };

            // act
            playConnectionService["onHandleMessage"](clientId, gameName, gameData);

            // assert
            expect(clientSocket.emit).toHaveBeenCalledWith(SocketEvents.message, { ...gameData, gameName });
        });
    });

    describe("onConnected", () => {
        it("should emit signin to game service", () => {
            // arrange
            const session = { ss: "123" };
            const socket = { emit: jest.fn() } as any;

            // act
            playConnectionService["onConnected"]("", { session }, socket);

            // assert
            expect(socket.emit).toHaveBeenCalledWith(Actions.signin, session);
        });
    });

    describe("onConnectError", () => {
        // arrange
        const FailedConnectionErrorCode = "SB0010";
        let clientSocket;
        let gameSocket;
        const error = { message: "connect fail" };
        const clientId = "asd";
        const data = { gameName };
        beforeEach(() => {
            gameSocket = { close: jest.fn() };
            clientSocket = { emit: jest.fn() };
            (playConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce(clientSocket);
        });
        it("should emit errorCode fail connect to client", () => {
            // act
            playConnectionService["onConnectError"](clientId, data, gameSocket, error);

            // assert
            expect(clientSocket.emit).toHaveBeenCalledWith(gameName, { errorCode: FailedConnectionErrorCode, reason: error.message });
        });

        it("should log error", () => {
            // act
            playConnectionService["onConnectError"](clientId, data, gameSocket, error);

            // assert
            expect(playConnectionService["logService"].error).toHaveBeenCalledWith(error.message);
        });

        it("should close game connection", () => {
            // act
            playConnectionService["onConnectError"](clientId, data, gameSocket, error);

            // assert
            expect(gameSocket.close).toHaveBeenCalled();
        });
    });

    describe("onDisconnect", () => {
        it("should publish error code to client", () => {
            // arrange
            const FailedConnectionErrorCode = "SB0010";
            const data = { gameName, reason: "disconnect" };
            const clientId = "asd";
            const clientSocket = { emit: jest.fn() };
            (playConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce(clientSocket);

            // act
            playConnectionService["onDisconnect"](clientId, data);

            // assert
            expect(clientSocket.emit).toHaveBeenCalledWith(gameName, { errorCode: FailedConnectionErrorCode, reason: data.reason });
        });
    });

    // GameConnectionService

    describe("getSocket", () => {
        it("should return expected", () => {
            // arrange
            const socket = { id: "123" } as any;
            const clientId = "asd";
            playConnectionService.init(clientId);
            playConnectionService.setSocket(clientId, gameName, socket);

            // act
            const actual = playConnectionService.getSocket(clientId, gameName);

            // assert
            expect(actual).toBe(socket);
        });
    });

    describe("getOrCreateSocket", () => {
        const clientSocket = { id: "123" };
        const data = { gameName };
        describe("connected play socket", () => {
            it("should return expected socket", () => {
                // arrange
                playConnectionService.init(clientSocket.id);
                const socket = { id: "socket", connected: true } as any;
                playConnectionService.setSocket(clientSocket.id, gameName, socket);
                playConnectionService.setupSocket = jest.fn();

                // act
                const actual = playConnectionService.getOrCreateSocket(clientSocket, data);

                // assert
                expect(playConnectionService.setupSocket).not.toHaveBeenCalled();
                expect(actual).toBe(socket);
            });
        });
        describe("disconnect play socket", () => {
            it("should setup new socket", () => {
                // arrange
                playConnectionService.init(clientSocket.id);
                const socket = { id: "socket", connected: false } as any;
                playConnectionService.setSocket(clientSocket.id, gameName, socket);
                const newSocket = { id: "socket2", connected: false } as any;
                playConnectionService.setupSocket = jest.fn().mockReturnValueOnce(newSocket);

                // act
                const actual = playConnectionService.getOrCreateSocket(clientSocket, data);

                // assert
                expect(actual).toBe(newSocket);
            });
        });
        describe("not exist play socket", () => {
            it("should setup new socket", () => {
                // arrange
                playConnectionService.init(clientSocket.id);
                const socket = { id: "socket" } as any;
                playConnectionService.setupSocket = jest.fn().mockReturnValueOnce(socket);

                // act
                const actual = playConnectionService.getOrCreateSocket(clientSocket, data);

                // assert
                expect(actual).toBe(socket);
            });
        });
    });

    describe("setSocket", () => {
        const clientId = "asd";
        it("should set socket if exist socket for clientId", () => {
            // arrange
            const socket = { id: "123" } as any;
            playConnectionService.init(clientId);

            // act
            playConnectionService.setSocket(clientId, gameName, socket);

            // assert
            expect(playConnectionService["sockets"][clientId][gameName]).toBe(socket);
        });

        it("should do nothing if not exist socket for clientId", () => {
            // arrange
            const socket = { id: "123" } as any;

            // act
            playConnectionService.setSocket(clientId, gameName, socket);

            // assert
            expect(playConnectionService["sockets"][clientId]?.[gameName]).toBeUndefined();
        });
    });

    describe("setupSocket", () => {
        const clientSocket = { id: "asd", request: { headers: { ["user-agent"]: "browser" } } };
        const data = { gameName } as any;
        describe("when not exist socketUri", () => {
            it("should return null", () => {
                // arrange
                playConnectionService["getSocketUri"] = jest.fn().mockReturnValueOnce(undefined);

                // act
                const actual = playConnectionService.setupSocket(clientSocket, data);

                // assert
                expect(playConnectionService["getSocketUri"]).toHaveBeenCalledWith(data.gameName, data.serviceName);
                expect(actual).toBeNull();
            });
        });

        it("should call initSocketOptions with expected params", () => {
            // arrange
            const socketUri = "socketUri";
            playConnectionService["getSocketUri"] = jest.fn().mockReturnValueOnce(socketUri);
            const options = { forceNew: true } as any;
            playConnectionService["initSocketOptions"] = jest.fn().mockReturnValueOnce(options);
            (io as jest.Mock).mockReturnValueOnce(null);

            // act
            playConnectionService.setupSocket(clientSocket, data);

            // assert
            expect(playConnectionService["initSocketOptions"]).toHaveBeenCalledWith(clientSocket.request.headers["user-agent"]);
        });

        it("should init socket with expected options", () => {
            // arrange
            const socketUri = "socketUri";
            playConnectionService["getSocketUri"] = jest.fn().mockReturnValueOnce(socketUri);
            const options = { forceNew: true } as any;
            playConnectionService["initSocketOptions"] = jest.fn().mockReturnValueOnce(options);
            (io as jest.Mock).mockReturnValueOnce(null);

            // act
            playConnectionService.setupSocket(clientSocket, data);

            // assert
            expect(io).toHaveBeenCalledWith(socketUri, options);
        });

        it("should call handleSocketEvents when init socket successfully", () => {
            // arrange
            const socketUri = "socketUri";
            playConnectionService["getSocketUri"] = jest.fn().mockReturnValueOnce(socketUri);
            const options = { forceNew: true } as any;
            playConnectionService["initSocketOptions"] = jest.fn().mockReturnValueOnce(options);
            const socket = { id: "123" };
            (io as jest.Mock).mockReturnValueOnce(socket);
            playConnectionService["handleSocketEvents"] = jest.fn();

            // act
            playConnectionService.setupSocket(clientSocket, data);

            // assert
            expect(playConnectionService["handleSocketEvents"]).toHaveBeenCalledWith(clientSocket.id, data, socket);
        });

        it("should return expected", () => {
            // arrange
            const socketUri = "socketUri";
            playConnectionService["getSocketUri"] = jest.fn().mockReturnValueOnce(socketUri);
            const options = { forceNew: true } as any;
            playConnectionService["initSocketOptions"] = jest.fn().mockReturnValueOnce(options);
            const socket = { id: "123" };
            (io as jest.Mock).mockReturnValueOnce(socket);
            playConnectionService["handleSocketEvents"] = jest.fn();

            // act
            const actual = playConnectionService.setupSocket(clientSocket, data);

            // assert
            expect(actual).toBe(socket);
        });
    });

    describe("emitEvent", () => {
        it("shound emit when connected socket", () => {
            // arrange
            const clientId = "asd";
            const eventName = Actions.inGame;
            const socket = { connected: true, emit: jest.fn() };
            playConnectionService.getSocket = jest.fn().mockReturnValueOnce(socket);

            // act
            playConnectionService.emitEvent(clientId, gameName, eventName, null);

            // assert
            expect(playConnectionService.getSocket).toHaveBeenCalledWith(clientId, gameName);
            expect(socket.emit).toHaveBeenCalledWith(eventName, null);
        });
    });

    describe("initSocketOptions", () => {
        describe("when disable msgpack", () => {
            it("should return expected without msgpack", () => {
                // arrange
                const userAgent = "userAgent";
                const expected = {
                    forceNew: true,
                    transports: ["websocket"],
                    upgrade: false,
                    extraHeaders: {
                        "user-agent": userAgent,
                        origin: "",
                    },
                };
                Object.defineProperty(playConnectionService, "enabledMsgpack", { value: false });
                // act
                const actual = playConnectionService["initSocketOptions"](userAgent);

                // assert
                expect(actual).toEqual(expected);
            });
        });
        describe("when enable msgpack", () => {
            it("should return expected with msgpack", () => {
                // arrange
                const userAgent = "userAgent";
                const expected = {
                    forceNew: true,
                    transports: ["websocket"],
                    upgrade: false,
                    extraHeaders: {
                        "user-agent": userAgent,
                        origin: "",
                    },
                    parser: MsgpackParser,
                };
                Object.defineProperty(playConnectionService, "enabledMsgpack", { value: true });
                // act
                const actual = playConnectionService["initSocketOptions"](userAgent);

                // assert
                expect(actual).toEqual(expected);
            });
        });
    });

    describe("getSocketUri", () => {
        describe("serviceName not null", () => {
            it("should return expected with url pattern", () => {
                // arrange
                const serviceName = "se_die";
                const serviceUrlPattern = "http://{0}-service";
                const serviceNameSeparator = "-";
                (playConnectionService["configService"].get as jest.Mock)
                    .mockReturnValueOnce(serviceUrlPattern)
                    .mockReturnValueOnce(serviceNameSeparator);
                playConnectionService["formatServiceUri"] = jest.fn((name) => `${name}/user`);
                const expected = "http://se-die-service/user";

                // act
                const actual = playConnectionService["getSocketUri"](gameName, serviceName);

                // assert
                expect(actual).toBe(expected);
            });
        });

        describe("serviceName = null", () => {
            it("should return data from config", () => {
                // arrange
                const expected = "http://game-service";
                Object.defineProperty(playConnectionService, "socketUris", { value: { gamename: expected } });

                // act
                const actual = playConnectionService["getSocketUri"](gameName, null);

                // assert
                expect(actual).toBe(expected);
            });
        });
    });

    describe("formatServiceUri", () => {
        it("should return expected", () => {
            // arrange
            const serviceUri = "http://game-name-service";
            const expected = `${serviceUri}/user/${gameName.toLowerCase()}`;

            // act
            const actual = playConnectionService["formatServiceUri"](serviceUri, gameName);

            // assert
            expect(actual).toBe(expected);
        });
    });
});
