import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Socket } from "socket.io-client";
import { CustomLogger } from "../../common/logger.service";
import { GameConnectionService } from "./game-connection.service";
import { ClientConnectionService } from "./client-connection.service";
import { Actions, DataKeys, SocketEvents } from "./contants";

@Injectable()
export class PlayConnectionService extends GameConnectionService {
    private readonly receivedEvents = [DataKeys.endBet, DataKeys.status];

    constructor(
        protected readonly configService: ConfigService,
        protected readonly logService: CustomLogger,
        protected readonly clientConnectionService: ClientConnectionService,
    ) {
        super(configService, logService, clientConnectionService);
    }

    init(clientId: string) {
        this.sockets[clientId] = {};
    }

    inGame(clientId: string, gameName: string) {
        this.emitEvent(clientId, gameName, Actions.inGame, null);
    }

    placeBet(clientId: string, data: any) {
        const { gameName, betData } = data;
        this.emitEvent(clientId, gameName, Actions.placeBet, betData);
    }

    disconnect(clientId: string) {
        const gameSockets = this.sockets[clientId];
        Object.values(gameSockets).forEach((socket: any) => {
            socket?.disconnect();
        });
        setTimeout(() => {
            delete this.sockets[clientId];
        }, 0);
    }

    protected override handleSocketEvents(clientId: any, data: any, socket: Socket) {
        super.handleSocketEvents(clientId, data, socket);
        const { gameName } = data;

        socket.on(SocketEvents.signedIn, () => {
            socket.emit(Actions.inGame, null);
        });

        socket.on(gameName, (gameData: any) => {
            this.onHandleGameData(clientId, gameName, gameData);
        });

        socket.on(SocketEvents.message, (gameData: any) => {
            this.onHandleMessage(clientId, gameName, gameData);
        });
    }

    private onHandleGameData(clientId: string, gameName: string, gameData: any) {
        try {
            const clientSocket = this.clientConnectionService.getSocket(clientId, gameName);
            if (gameData.gameConfigs && !gameData.snr) {
                clientSocket?.emit(gameName, { gameConfigs: gameData.gameConfigs });
                return;
            }
            Object.keys(gameData).some((key) => this.receivedEvents.includes(key)) && clientSocket.emit(gameName, gameData);
        } catch (ex) {
            this.logService.error(ex);
        }
    }

    private onHandleMessage(clientId: string, gameName: string, gameData: any) {
        try {
            const clientSocket = this.clientConnectionService.getSocket(clientId, gameName);
            clientSocket.emit(SocketEvents.message, { ...gameData, gameName });
        } catch (ex) {
            this.logService.error(ex);
        }
    }

    protected override onConnected(clientId: string, data: any, socket: Socket): void {
        const { session } = data;
        socket.emit(Actions.signin, session);
    }

    protected override onConnectError(clientId: string, data: any, socket: Socket, error: any): void {
        try {
            const { gameName } = data;
            const clientSocket = this.clientConnectionService.getSocket(clientId, gameName);
            clientSocket?.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            super.onConnectError(clientId, data, socket, error);
        } catch (ex) {
            this.logService.error(ex);
        }
    }

    protected override onDisconnect(clientId: string, data: any): void {
        try {
            const { gameName } = data;
            const clientSocket = this.clientConnectionService.getSocket(clientId, gameName);
            clientSocket?.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
        } catch (ex) {
            this.logService.error(ex);
        }
    }
}
