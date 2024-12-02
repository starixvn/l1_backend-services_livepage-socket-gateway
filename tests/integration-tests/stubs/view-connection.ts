import { SocketServerMock } from "socket.io-mock-ts";
import { gameName } from "./data";

export const initViewConnection = () => {
    const socketServer = new SocketServerMock();
    const client = socketServer.clientMock;
    socketServer.on("connect", () => {
        socketServer.emit("connect");
    });
    socketServer.on("inGame", (data) => {
        socketServer.emit(gameName, { [data.id]: { gameConfigs: { odds: { choice: 1 } }, remainingTime: 10, roundId: 1 } });
    });
    return { socketServer, client };
};
