import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Socket } from "socket.io-client";
import { CustomLogger } from "./../../common/logger.service";
import { ClientConnectionService } from "./client-connection.service";
import { GameConnectionService } from "./game-connection.service";
import { Actions, DataKeys } from "./contants";

@Injectable()
export class ViewConnectionService extends GameConnectionService {
    constructor(
        protected readonly configService: ConfigService,
        protected readonly logService: CustomLogger,
        protected readonly clientConnectionService: ClientConnectionService,
    ) {
        super(configService, logService, clientConnectionService);
    }

    get receivedEvents(): string[] {
        return [
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
    }

    getSocket(clientId: string, gameName: string): Socket {
        console.log(`Getting view socket for client: ${clientId}, game: ${gameName}`);
        return this.sockets[gameName];
    }

    getOrCreateSocket(clientSocket: any, data: any): Socket {
        const { gameName } = data;
        console.log(`Get or create view socket for game: ${gameName}`);
        if (!this.sockets[gameName]?.connected) {
            console.log(`Creating new view socket for game: ${gameName}`);
            this.sockets[gameName] = this.setupSocket(clientSocket, data);
        } else {
            console.log(`Reusing existing view socket for game: ${gameName}`);
        }
        return this.sockets[gameName];
    }

    setSocket(clientId: string, gameName: string, socket: Socket) {
        console.log(`Setting view socket for client: ${clientId}, game: ${gameName}`);
        this.sockets[gameName] = socket;
    }

    inGame(clientId: string, gameName: string) {
        console.log(`Sending inGame event for client: ${clientId}, game: ${gameName}`);
        this.emitEvent(clientId, gameName, Actions.inGame, { id: clientId });
    }

    disconnect(clientId: string, gameName: string) {
        console.log(`Disconnecting view socket for client: ${clientId}, game: ${gameName}`);
        this.sockets[gameName]?.disconnect();
        setTimeout(() => {
            console.log(`Removing view socket for game: ${gameName}`);
            delete this.sockets[gameName];
        }, 0);
    }

    protected override formatServiceUri(serviceUri: string, gameName: string): string {
        const formattedUri = `${serviceUri}/view/${gameName.toLowerCase()}`;
        console.log(`Formatted service URI for game ${gameName}: ${formattedUri}`);
        return formattedUri;
    }



    protected override onHandleGameData(clientId: string, gameName: string, receivedEvents: string[], gameData: any) {
        try {
            console.log(`Handling game data for client game: ${gameName}, events: ${JSON.stringify(Object.keys(gameData))}`);

            const hasRelevantEvents = Object.keys(gameData).some((key: string) => receivedEvents.includes(key));
            if (hasRelevantEvents) {
                console.log(`Publishing relevant game data to all players in game: ${gameName}`);
                this.clientConnectionService.publishToAllPlayers(gameName, gameData);
            }

            const clientId = Object.keys(gameData).find((key: string) => this.clientConnectionService.getSocket(key, gameName)?.connected);
            if (clientId) {
                console.log(`Publishing specific game data to client: ${clientId} in game: ${gameName}`);
                this.clientConnectionService.publishToPlayer(clientId, gameName, gameData[clientId]);
            }
        } catch (ex) {
            console.log(`Error handling game data: ${ex.message}`);
            this.logService.error(ex);
        }
    }

    protected override onConnected(clientId: string, data: any, socket: Socket): void {
        console.log(`View socket connected for client: ${clientId}, game: ${data.gameName}`);
        socket.emit(Actions.inGame, { id: clientId });
    }

    protected override onConnectError(clientId: string, data: any, socket: Socket, error: any): void {
        try {
            console.log(`View socket connect error for client: ${clientId}, game: ${data.gameName}, error: ${error.message}`);
            this.clientConnectionService.publishToAllPlayers(data.gameName, {
                errorCode: this.FailedConnectionErrorCode,
                reason: error.message,
            });
            super.onConnectError(clientId, data, socket, error);
        } catch (ex) {
            console.log(`Error handling connect error: ${ex.message}`);
            this.logService.error(ex);
        }
    }

    protected override onDisconnect(clientId: string, data: any): void {
        try {
            console.log(`View socket disconnected for client: ${clientId}, game: ${data.gameName}, reason: ${data.reason}`);
            this.clientConnectionService.publishToAllPlayers(data.gameName, {
                errorCode: this.FailedConnectionErrorCode,
                reason: data.reason,
            });
            super.onDisconnect(clientId, data);
        } catch (ex) {
            console.log(`Error handling disconnect: ${ex.message}`);
            this.logService.error(ex);
        }
    }
}
