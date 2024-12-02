import { GameClientDriver } from "./stubs/client-connection";
import { gameName, gatewayUrl, validSession } from "./stubs/data";
import { GameService } from "./stubs/game-service";
import { io as initSocket } from "socket.io-client";
export const signInTests = () => {
    describe("sign in", () => {
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

        describe("player signin", () => {
            it("client should only receive gameConfigs", async () => {
                // arrange
                const data = { gameName, session: { ss: validSession, uersname: "player" } };

                // act
                client.emit("signin", data);

                // assert
                const result = await client.handleJoinedGame();
                expect(result.gameConfigs?.minBet).toBeGreaterThan(0);
                expect(result.roundId).toBeUndefined();
                expect(result.remainingTime).toBeUndefined();
            });
        });
    });
};
