import { SocketServerMock } from "socket.io-mock-ts";
import { gameName } from "./data";

export const initPlayConnection = () => {
    const socketServer = new SocketServerMock();
    const client = socketServer.clientMock;
    socketServer.on("connect", () => {
        socketServer.emit("connect");
    });
    socketServer.on("signin", () => {
        socketServer.emit("signedIn");
    });
    socketServer.on("inGame", () => {
        socketServer.emit(gameName, { gameConfigs: { minBet: 10, odds: { choice: 1 } }, remainingTime: 10, roundId: 1 });
    });
    socketServer.on("bet", ({ amount, betChoice }) => {
        socketServer.emit(gameName, { endBet: amount, betChoice });
    });
    return { socketServer, client };
};
