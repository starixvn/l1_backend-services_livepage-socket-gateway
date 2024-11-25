import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Socket } from "socket.io-client";
import { CustomLogger } from "./../../common/logger.service";
import { ClientConnectionService } from "./client-connection.service";
import { GameConnectionService } from "./game-connection.service";
import { Actions, DataKeys } from "./contants";

@Injectable()
export class ViewConnectionService extends GameConnectionService {
    private readonly receivedEvents = [
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

    constructor(
        protected readonly configService: ConfigService,
        protected readonly logService: CustomLogger,
        protected readonly clientConnectionService: ClientConnectionService,
    ) {
        super(configService, logService, clientConnectionService);
    }

    getSocket(clientId: string, gameName: string) {
        return this.sockets[gameName];
    }

    setSocket(clientId: string, gameName: string, socket: Socket) {
        this.sockets[gameName] = socket;
    }

    inGame(clientId: string, gameName: string) {
        this.emitEvent(clientId, gameName, Actions.inGame, { id: clientId });
    }

    disconnect(clientId: string, gameName: string) {
        this.sockets[gameName]?.disconnect();
        setTimeout(() => {
            delete this.sockets[gameName];
        }, 0);
    }

    protected override formatServiceUri(serviceUri: string, gameName: string): string {
        return `${serviceUri}/view/${gameName.toLowerCase()}`;
    }

    protected override handleSocketEvents(clientId: string, data: any, socket: Socket) {
        super.handleSocketEvents(clientId, data, socket);

        const { gameName } = data;
        socket.on(gameName, (data: any) => {
            this.onHandleGameData(gameName, data);
        });
    }

    private onHandleGameData(gameName: string, gameData: any) {
        try {
            Object.keys(gameData).some((key: string) => this.receivedEvents.includes(key)) &&
                this.clientConnectionService.publishToAllPlayers(gameName, gameData);
            const clientId = Object.keys(gameData).find((key: string) => this.clientConnectionService.getSocket(key, gameName)?.connected);
            clientId && this.clientConnectionService.publishToPlayer(clientId, gameName, gameData[clientId]);
        } catch (ex) {
            this.logService.error(ex);
        }
    }

    protected override onConnected(clientId: string, data: any, socket: Socket): void {
        socket.emit("inGame", { id: clientId });
    }

    protected override onConnectError(clientId: string, data: any, socket: Socket, error: any): void {
        try {
            this.clientConnectionService.publishToAllPlayers(data.gameName, { errorCode: this.FailedConnectionErrorCode });
            super.onConnectError(clientId, data, socket, error);
        } catch (ex) {
            this.logService.error(ex);
        }
    }

    protected override onDisconnect(clientId: string, data: any): void {
        try {
            this.clientConnectionService.publishToAllPlayers(data.gameName, { errorCode: this.FailedConnectionErrorCode });
        } catch (ex) {
            this.logService.error(ex);
        }
    }
}
