import { SocketServerMock, SocketClientMock } from "socket.io-mock-ts";
import { gameName } from "./data";
import { initViewConnection } from "./view-connection";
import { initPlayConnection } from "./play-connection";

export class GameService {
    private static instance: GameService;
    public static getInstance(): GameService {
        if (!this.instance) {
            this.instance = new GameService();
        }
        return this.instance;
    }
    viewServer: SocketServerMock;
    viewClientConnection: SocketClientMock;
    playServer: { [playerId: string]: SocketServerMock } = {};
    playClientConnection: { [playerId: string]: SocketClientMock } = {};

    constructor() {
        this.init();
    }

    init() {
        const { socketServer, client } = initViewConnection();
        this.viewServer = socketServer;
        this.viewClientConnection = client;
    }

    initPlayConnection(playerId: string) {
        const { socketServer, client } = initPlayConnection();
        this.playServer[playerId] = socketServer;
        this.playClientConnection[playerId] = client;
    }

    getPlayConnection(playerId: string) {
        return this.playClientConnection[playerId];
    }

    closePlayConnection(playerId: string) {
        this.playServer[playerId] = null;
        this.playClientConnection[playerId] = null;
    }

    viewServerEmitEvent(data: any, event = gameName) {
        this.emitEvent(this.viewServer, data, event);
    }

    playServerEmitEvent(playerId: string, data: any, event = gameName) {
        this.emitEvent(this.playServer[playerId], data, event);
    }

    private emitEvent(socket: SocketServerMock, data: any, event = gameName) {
        socket?.emit(event, data);
    }
}
