import { GameClientDriver } from "./stubs/client-connection";
import { gameName, gatewayUrl, validSession } from "./stubs/data";
import { GameService } from "./stubs/game-service";
import { io as initSocket } from "socket.io-client";

export const outGameTests = () => {
    describe("outGame", () => {
        let io;
        let client: GameClientDriver;
        let gameService: GameService;
        beforeAll(() => {
            io = jest.requireActual("socket.io-client");
            gameService = new GameService();
        });
        beforeEach(async () => {
            client = new GameClientDriver({ io, gameName, socketUri: gatewayUrl });
            await client.waitForEvent("connect", () => true);
            gameService?.initPlayConnection(client.getSocket().id);
            (initSocket as jest.Mock).mockReturnValueOnce(gameService.getPlayConnection(client.getSocket().id));
        });
        afterEach(() => {
            client?.close();
        });

        describe("player out game", () => {
            it("should disconnect play connection", async () => {
                // arrange
                const dataSignin = { gameName, session: { ss: validSession, uersname: "player" } };
                client.emit("signin", dataSignin);
                await client.handleJoinedGame();
                const playerConnection = gameService.getPlayConnection(client.getSocket().id);

                // act
                client.emit("outGame", gameName);

                // assert
                await new Promise((resolve) => {
                    gameService.playServer[client.getSocket().id].on("disconnect", () => {
                        expect(playerConnection.connected).toBeFalsy();
                        resolve(null);
                    });
                });
            });
        });
    });
};
