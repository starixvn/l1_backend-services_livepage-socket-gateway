import { GameClientDriver } from "./stubs/client-connection";
import { gameName, gatewayUrl, validSession } from "./stubs/data";
import { GameService } from "./stubs/game-service";
import { io as initSocket } from "socket.io-client";
export const betTests = () => {
    describe("bet", () => {
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

        describe("player bet successfully", () => {
            it("client should only receive endBet & betChoice", async () => {
                // arrange
                const dataSignin = { gameName, session: { ss: validSession, uersname: "player" } };
                client.emit("signin", dataSignin);
                await client.handleJoinedGame();
                const bet = { amount: 1, betChoice: "choice1" };
                const dataBet = { gameName, betData: bet };
                const condition = (data) => data.endBet;

                // act
                client.emit("bet", dataBet);

                // assert
                const result = await client.handleGameEvent(condition);
                expect(result.endBet).toBe(bet.amount);
                expect(result.betChoice).toBe(bet.betChoice);
            });
        });
    });
};
