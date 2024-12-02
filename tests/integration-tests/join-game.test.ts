import { GameClientDriver } from "./stubs/client-connection";
import { gameName, gatewayUrl, invalidSession, validSession } from "./stubs/data";
import { GameService } from "./stubs/game-service";
import { io as initSocket } from "socket.io-client";

export const joinGameTests = () => {
    describe("join game", () => {
        let io;
        let client: GameClientDriver;
        let gameService: GameService;
        beforeAll(() => {
            io = jest.requireActual("socket.io-client");
            gameService = new GameService();
            (initSocket as jest.Mock).mockReturnValue(gameService.viewClientConnection);
        });
        beforeEach(() => {
            client = new GameClientDriver({ io, gameName, socketUri: gatewayUrl });
        });
        afterEach(() => {
            client?.close();
        });
        describe("session is invalid", () => {
            it("client should receive unauthorized", async () => {
                // arrange
                const data = { gameName, session: { ss: invalidSession, username: "player" } };
                const condition = (data) => data.unauthorized;

                // act
                client.emit("joinGame", data);

                // assert
                const result = await client.waitForEvent("message", condition);
                expect(result.unauthorized).toBeTruthy();
            });
        });

        describe("session is valid", () => {
            it("client should receive game data after join game successfully", async () => {
                // arrange
                const data = { gameName, session: { ss: validSession, username: "player" } };

                // act
                client.emit("joinGame", data);

                // assert
                const result = await client.handleJoinedGame();
                expect(result.gameConfigs).not.toBeUndefined();
                expect(result.roundId).toBeGreaterThan(0);
                expect(result.remainingTime).toBeGreaterThan(0);
            });
        });

        describe("game service emit data to view connection", () => {
            it("all clients in game should receive data", async () => {
                // arrange
                const data = { gameName, session: { ss: validSession, username: "player" } };
                client.emit("joinGame", data);
                const client2 = new GameClientDriver({ io, gameName, socketUri: gatewayUrl });
                client2.emit("joinGame", data);
                await client2.handleJoinedGame();
                const finish = { finish: { choice1: true } };
                const condition = (data) => data.finish;

                // act
                gameService.viewServerEmitEvent(finish, gameName);

                // assert
                const result1 = client.handleGameEvent(condition);
                const result2 = client.handleGameEvent(condition);
                const [finish1, finish2] = await Promise.all([result1, result2]);
                client2.close();
                expect(finish1).toEqual(finish);
                expect(finish2).toEqual(finish);
            });
        });
    });
};
