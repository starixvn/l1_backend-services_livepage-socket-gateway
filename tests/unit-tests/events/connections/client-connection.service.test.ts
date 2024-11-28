import { ClientConnectionService } from "../../../../src/events/connections";

describe(ClientConnectionService.name, () => {
    let clientConnection: ClientConnectionService;
    beforeEach(() => {
        clientConnection = new ClientConnectionService();
        jest.useFakeTimers();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    const gameName = "gameName";

    describe("init", () => {
        it("should init socket client", () => {
            // arrange
            const clientId = "asd";

            // act
            clientConnection.init(clientId);

            // assert
            expect(clientConnection["sockets"][clientId]).toEqual({});
        });
    });

    describe("setSocket", () => {
        const clientId = "asd";
        const socket = { id: "123" };
        it("should set socket if exist client socket", () => {
            // arrange
            clientConnection.init(clientId);

            // act
            clientConnection.setSocket(clientId, gameName, socket as any);

            // assert
            expect(clientConnection["sockets"][clientId][gameName]).toBe(socket);
        });

        it("should not set socket if not exist client socket", () => {
            // act
            clientConnection.setSocket(clientId, gameName, socket as any);

            // assert
            expect(clientConnection["sockets"][clientId]?.[gameName]).toBe(undefined);
        });
    });

    describe("disconnect", () => {
        it("should disconnect all sockets of client", () => {
            // arrange
            const clientId = "asd";
            const socket1 = { disconnect: jest.fn() };
            const socket2 = { disconnect: jest.fn() };
            clientConnection.init(clientId);
            clientConnection.setSocket(clientId, "game1", socket1 as any);
            clientConnection.setSocket(clientId, "game2", socket2 as any);

            // act
            clientConnection.disconnect(clientId);
            jest.runAllTimers();

            // assert
            expect(socket1.disconnect).toHaveBeenCalled();
            expect(socket2.disconnect).toHaveBeenCalled();
            expect(clientConnection["sockets"][clientId]).toBeUndefined();
        });
    });

    describe("publishToAllPlayers", () => {
        it("should publish data to all client connect the game", () => {
            // arrange
            const client1 = { id: "1" };
            const client2 = { id: "2" };
            clientConnection.init(client1.id);
            clientConnection.init(client2.id);
            const socket1 = { emit: jest.fn() };
            const socket2 = { emit: jest.fn() };
            clientConnection.setSocket(client1.id, gameName, socket1 as any);
            clientConnection.setSocket(client2.id, gameName, socket2 as any);
            const data = { a: 1 };

            // act
            clientConnection.publishToAllPlayers(gameName, data);

            // assert
            expect(socket1.emit).toHaveBeenCalledWith(gameName, data);
            expect(socket2.emit).toHaveBeenCalledWith(gameName, data);
        });
    });

    describe("publishToPlayer", () => {
        it("should publish data to client", () => {
            // arrange
            const client1 = { id: "1" };
            const client2 = { id: "2" };
            clientConnection.init(client1.id);
            clientConnection.init(client2.id);
            const socket1 = { emit: jest.fn() };
            const socket2 = { emit: jest.fn() };
            clientConnection.setSocket(client1.id, gameName, socket1 as any);
            clientConnection.setSocket(client2.id, gameName, socket2 as any);
            const data = { a: 1 };

            // act
            clientConnection.publishToPlayer(client1.id, gameName, data);

            // assert
            expect(socket1.emit).toHaveBeenCalledWith(gameName, data);
            expect(socket2.emit).not.toHaveBeenCalled();
        });
    });

    describe("getSocket", () => {
        const clientId = "asd";
        it("should return null if not exist socket", () => {
            // act
            const actual = clientConnection.getSocket(clientId, gameName);

            // assert
            expect(actual).toBeNull();
        });

        it("should return socket if exist socket", () => {
            // arrange
            clientConnection.init(clientId);
            const socket = { id: "socket" };
            clientConnection.setSocket(clientId, gameName, socket as any);

            // act
            const actual = clientConnection.getSocket(clientId, gameName);

            // assert
            expect(actual).toBe(socket);
        });
    });
});
