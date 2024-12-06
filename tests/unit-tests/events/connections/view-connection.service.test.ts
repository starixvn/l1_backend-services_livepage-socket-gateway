import { ViewConnectionService } from "../../../../src/events/connections";
import { Actions, DataKeys } from "../../../../src/events/connections/contants";

describe(ViewConnectionService.name, () => {
    let viewConnectionService: ViewConnectionService;
    const gameName = "gameName";
    beforeEach(() => {
        jest.useFakeTimers();
        const configService = { get: jest.fn().mockReturnValue({}) };
        const logService = { error: jest.fn() } as any;
        const clientConnectionService = { getSocket: jest.fn(), publishToAllPlayers: jest.fn(), publishToPlayer: jest.fn() };
        viewConnectionService = new ViewConnectionService(configService as any, logService, clientConnectionService as any);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("get receivedEvents", () => {
        it("should return expected", () => {
            // arrange
            const expected = [
                DataKeys.roundId,
                DataKeys.gameConfigs,
                DataKeys.remainingTime,
                DataKeys.roundHistory,
                DataKeys.odds,
                DataKeys.startNewRound,
                DataKeys.startPlaceBet,
                DataKeys.endPlaceBet,
                DataKeys.finish,
                DataKeys.um,
            ];

            // assert
            expect(viewConnectionService.receivedEvents).toEqual(expected);
        });
    });

    describe("getSocket", () => {
        it("should return expected", () => {
            // arrange
            const socket = { id: "123" };
            viewConnectionService["sockets"][gameName] = socket;

            // act
            const actual = viewConnectionService.getSocket("asd", gameName);

            // assert
            expect(actual).toBe(socket);
        });
    });

    describe("getOrCreateSocket", () => {
        describe("exist view socket", () => {
            it("should return expected if socket.connected = true", () => {
                // arrange
                const socket = { id: "123", connected: true };
                viewConnectionService["sockets"][gameName] = socket;

                // act
                const actual = viewConnectionService.getOrCreateSocket({}, { gameName });

                // assert
                expect(actual).toBe(socket);
            });

            it("should init new socket if socket.connected = false", () => {
                // arrange
                const socket = { id: "123", connected: false };
                viewConnectionService["sockets"][gameName] = socket;
                const newSocket = { id: "321", connected: true };
                viewConnectionService.setupSocket = jest.fn().mockReturnValueOnce(newSocket);
                const clientSocket = { id: "asd" };

                // act
                const actual = viewConnectionService.getOrCreateSocket(clientSocket, { gameName });

                // assert
                expect(viewConnectionService.setupSocket).toHaveBeenCalledWith(clientSocket, { gameName });
                expect(actual).toBe(newSocket);
            });
        });

        describe("not exist view socket", () => {
            it("should init new socket", () => {
                // arrange
                const socket = { id: "123", connected: true };
                viewConnectionService.setupSocket = jest.fn().mockReturnValueOnce(socket);
                const clientSocket = { id: "asd" };

                // act
                const actual = viewConnectionService.getOrCreateSocket(clientSocket, { gameName });

                // assert
                expect(viewConnectionService.setupSocket).toHaveBeenCalledWith(clientSocket, { gameName });
                expect(actual).toBe(socket);
            });
        });
    });

    describe("setSocket", () => {
        it("should run correctly", () => {
            // arrange
            const socket = { id: "123" } as any;

            // act
            viewConnectionService.setSocket("asd", gameName, socket);

            // assert
            expect(viewConnectionService["sockets"][gameName]).toBe(socket);
        });
    });

    describe("inGame", () => {
        it("should call emitEvent with correct params", () => {
            // arrange
            const clientId = "asd";
            viewConnectionService.emitEvent = jest.fn();

            // act
            viewConnectionService.inGame(clientId, gameName);

            // assert
            expect(viewConnectionService.emitEvent).toHaveBeenCalledWith(clientId, gameName, Actions.inGame, { id: clientId });
        });
    });

    describe("disconnect", () => {
        it("should disconnect socket", () => {
            // arrange
            const socket = { disconnect: jest.fn() } as any;
            viewConnectionService.setSocket("asd", gameName, socket);

            // act
            viewConnectionService.disconnect("asd", gameName);
            jest.runAllTimers();

            // assert
            expect(socket.disconnect).toHaveBeenCalled();
        });
    });

    describe("formatServiceUri", () => {
        it("should return expected", () => {
            // arrange
            const serviceUri = "http://game-service";
            const expected = `${serviceUri}/view/${gameName.toLowerCase()}`;

            // act
            const actual = viewConnectionService["formatServiceUri"](serviceUri, gameName);

            // assert
            expect(actual).toBe(expected);
        });
    });

    describe("onHandleGameData", () => {
        const clientId = "asd";
        describe("data has key included receivedEvents", () => {
            const data = [
                { roundId: 123 },
                { gameConfigs: { minBet: 10 } },
                { remainingTime: 10 },
                { roundHistory: [{ round: 123 }] },
                { odds: { choice1: 2 } },
                { snr: true },
                { spb: true },
                { epb: true },
                { finish: { choice1: true } },
                { um: true },
            ];
            it.each(data)("should publish data to all client", (gameData) => {
                // arrange
                (viewConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce(null);

                // act
                viewConnectionService["onHandleGameData"]("aaa", gameName, viewConnectionService.receivedEvents, gameData);

                // assert
                expect(viewConnectionService["clientConnectionService"].publishToAllPlayers).toHaveBeenCalledWith(gameName, gameData);
            });
        });

        describe("data has key is clientId", () => {
            it("should publish to only one player if client socket connected", () => {
                // arrange
                const data = { [clientId]: { gameConfigs: { minBet: 10 }, remainingTime: 10 } };
                (viewConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce({ connected: true });

                // act
                viewConnectionService["onHandleGameData"]("aaa", gameName, viewConnectionService.receivedEvents, data);

                // assert
                expect(viewConnectionService["clientConnectionService"].publishToAllPlayers).not.toHaveBeenCalled();
                expect(viewConnectionService["clientConnectionService"].publishToPlayer).toHaveBeenCalledWith(
                    clientId,
                    gameName,
                    data[clientId],
                );
            });

            it("should not publish to anyone if exist client socket", () => {
                // arrange
                const data = { [clientId]: { gameConfigs: { minBet: 10 }, remainingTime: 10 } };
                (viewConnectionService["clientConnectionService"].getSocket as jest.Mock).mockReturnValueOnce(null);

                // act
                viewConnectionService["onHandleGameData"]("aaa", gameName, viewConnectionService.receivedEvents, data);

                // assert
                expect(viewConnectionService["clientConnectionService"].publishToAllPlayers).not.toHaveBeenCalled();
                expect(viewConnectionService["clientConnectionService"].publishToPlayer).not.toHaveBeenCalled();
            });
        });

        describe("data has key not included receivedEvents", () => {
            it("should not publish to client", () => {
                // arrange
                const data = { status: { winAmount: 10 } };

                // act
                viewConnectionService["onHandleGameData"](clientId, gameName, viewConnectionService.receivedEvents, data);

                // assert
                expect(viewConnectionService["clientConnectionService"].publishToAllPlayers).not.toHaveBeenCalled();
                expect(viewConnectionService["clientConnectionService"].publishToPlayer).not.toHaveBeenCalled();
            });
        });
    });

    describe("onConnected", () => {
        it("should emit inGame after connected", () => {
            // arrange
            const socket = { emit: jest.fn() } as any;
            const clientId = "asd";

            // act
            viewConnectionService["onConnected"](clientId, {}, socket);

            // assert
            expect(socket.emit).toHaveBeenCalledWith(Actions.inGame, { id: clientId });
        });
    });

    describe("onConnectError", () => {
        // arrange
        const clienId = "asd";
        const error = { message: "error" };
        const FailedConnectionErrorCode = "SB0010";
        it("should publish errorCode to all clients", () => {
            // arrange
            const socket = { close: jest.fn() } as any;

            // act
            viewConnectionService["onConnectError"](clienId, { gameName }, socket, error);

            // assert
            expect(viewConnectionService["clientConnectionService"].publishToAllPlayers).toHaveBeenCalledWith(gameName, {
                errorCode: FailedConnectionErrorCode,
                reason: error.message,
            });
        });

        it("should log error", () => {
            // arrange
            const socket = { close: jest.fn() } as any;

            // act
            viewConnectionService["onConnectError"](clienId, { gameName }, socket, error);

            // assert
            expect(viewConnectionService["logService"].error).toHaveBeenCalledWith(error.message);
        });

        it("should close socket", () => {
            // arrange
            const socket = { close: jest.fn() } as any;

            // act
            viewConnectionService["onConnectError"](clienId, { gameName }, socket, error);

            // assert
            expect(socket.close).toHaveBeenCalled();
        });
    });

    describe("onDisconnect", () => {
        it("should publish errorCode to all clients", () => {
            // arrange
            const FailedConnectionErrorCode = "SB0010";
            const data = { gameName, reason: "disconnect" };

            // act
            viewConnectionService["onDisconnect"]("asd", data);

            // assert
            expect(viewConnectionService["clientConnectionService"].publishToAllPlayers).toHaveBeenCalledWith(gameName, {
                errorCode: FailedConnectionErrorCode,
                reason: data.reason,
            });
        });
    });
});
