import { ConfigService } from "@nestjs/config";
import { CustomLogger } from "../../common/logger.service";
import { ClientConnectionService } from "./client-connection.service";
import * as MsgpackParser from "socket.io-msgpack-parser";
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";

export abstract class GameConnectionService {
    protected sockets = {};
    private readonly enabledMsgpack: boolean;
    private socketUris: { [gameName: string]: string } = {};
    protected readonly FailedConnectionErrorCode = "SB0010";

    constructor(
        protected readonly configService: ConfigService,
        protected readonly logService: CustomLogger,
        protected readonly clientConnectionService: ClientConnectionService,
    ) {
        this.enabledMsgpack = this.configService.get<boolean>("enabledMsgPack");
        const serviceConfigurations = this.configService.get<string>("services");
        Object.entries(serviceConfigurations).forEach(([key, value]) => (this.socketUris[key] = this.formatServiceUri(value, key)));
    }

    get receivedEvents(): string[] {
        return [];
    }

    getSocket(clientId: string, gameName: string): Socket {
        return this.sockets[clientId]?.[gameName];
    }

    setSocket(clientId: string, gameName: string, socket: Socket) {
        if (this.sockets[clientId]) {
            this.sockets[clientId][gameName] = socket;
        }
    }

    setupSocket(clientSocket: any, data: any) {
        const socketUri = this.getSocketUri(data.gameName, data.serviceName);
        if (socketUri === undefined) {
            return null;
        }

        const options = this.initSocketOptions(clientSocket.request.headers["user-agent"]);
        const socket = io(socketUri, options);

        socket && this.handleSocketEvents(clientSocket.id, data, socket);

        return socket;
    }

    emitEvent(clientId: string, gameName: string, eventName: string, data: any) {
        const socket = this.getSocket(clientId, gameName);
        if (socket?.connected) {
            socket.emit(eventName, data);
        }
    }

    private initSocketOptions(userAgent: string): Partial<ManagerOptions & SocketOptions> {
        const options: Partial<ManagerOptions & SocketOptions> = {
            forceNew: true,
            transports: ["websocket"],
            upgrade: false,
            extraHeaders: {
                "user-agent": userAgent,
                origin: "",
            },
        };
        if (this.enabledMsgpack) {
            options.parser = MsgpackParser;
        }
        return options;
    }

    private getSocketUri(gameName: string, serviceName: string): string {
        if (serviceName) {
            const serviceUrlPattern = this.configService.get<string>("serviceUrlPattern");
            const serviceNameSeparator = this.configService.get<string>("serviceNameSeparator");
            return this.formatServiceUri(serviceUrlPattern.replace("{0}", serviceName.replace(/-|_|\s/g, serviceNameSeparator)), gameName);
        }

        return this.socketUris[gameName.trim().toLowerCase()];
    }

    protected formatServiceUri(serviceUri: string, gameName: string): string {
        return `${serviceUri}/user/${gameName.toLowerCase()}`;
    }

    protected handleSocketEvents(clientId: string, data: any, socket: Socket) {
        socket.on("connect", () => {
            this.onConnected(clientId, data, socket);
        });

        const { gameName } = data;
        const receivedEvents = data.receivedEvents || this.receivedEvents;
        socket.on(gameName, (gameData: any) => {
            this.onHandleGameData(clientId, gameName, receivedEvents, gameData);
        });

        socket.on("connect_error", (error: any) => {
            this.onConnectError(clientId, data, socket, error);
        });

        socket.on("disconnect", (reason) => {
            this.onDisconnect(clientId, { reason, ...data });
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onConnected(clientId: string, data: any, socket: Socket) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onHandleGameData(clientId: string, gameName: string, receivedEvents: string[], gameData: any) {}

    protected onConnectError(clientId: string, data: any, socket: Socket, error: any) {
        this.logService.error(error.message);
        socket.close();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected onDisconnect(clientId: string, data: any) {}
}
