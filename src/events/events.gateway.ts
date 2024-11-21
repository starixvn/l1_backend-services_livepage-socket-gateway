import { UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { RavenInterceptor } from "nest-raven";
import { io, ManagerOptions, Socket, SocketOptions } from "socket.io-client";
import * as MsgpackParser from "socket.io-msgpack-parser";
import * as prometheus from "socket.io-prom-metrics";
import { CustomLogger } from "./../common/logger.service";

@WebSocketGateway({
    transports: ["websocket"],
    pingInterval: 60 * 1000,
    pingTimeout: 60 * 1000,
    allowUpgrades: false,
    allowEIO3: true,
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private readonly FailedConnectionErrorCode = "SB0010";
    private socketIOMetrics: prometheus.SocketIOMetrics;
    private socketUris = {};
    private enabledMsgpack: boolean;
    private viewSockets: { [gameName: string]: Socket } = {};
    private clientSockets = {};
    private gameSockets = {};
    private readonly viewEvents = ["roundId", "gameConfigs", "remainingTime", "roundHistory", "odds", "snr", "spb", "epb", "finish", "um"];
    private readonly playerEvents = ["endBet", "status"];

    @WebSocketServer()
    server: any;

    constructor(
        private readonly configService: ConfigService,
        private readonly logService: CustomLogger,
    ) {}

    afterInit(server: any) {
        this.socketIOMetrics = prometheus.metrics(server, {
            collectDefaultMetrics: true,
            checkForNewNamespaces: false,
        });

        const serviceConfigurations = this.configService.get<string>("services");
        this.enabledMsgpack = this.configService.get<boolean>("enabledMsgPack");
        Object.entries(serviceConfigurations).forEach(([key, value]) => (this.socketUris[key] = this.formatServiceUri(value, key)));
    }

    getSocketMetrics(): string {
        return this.socketIOMetrics.register.metrics();
    }

    handleConnection(client: any) {
        this.clientSockets[client.id] = {};
        this.gameSockets[client.id] = {};
    }

    handleDisconnect(client: any) {
        if (!this.clientSockets[client.id]) {
            return;
        }

        const sockets = this.clientSockets[client.id];

        Object.values(sockets).forEach((socket: any) => {
            if (socket) {
                socket.disconnect();
                socket.close();
            }
        });

        setTimeout(() => {
            delete this.clientSockets[client.id];
            delete this.gameSockets[client.id];
        });
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("joinGame")
    joinGame(@MessageBody() data: any, @ConnectedSocket() client: any) {
        if (!data?.gameName || !data?.session) {
            return;
        }

        // TODO: verify session

        const currentSocket = this.getViewSocket(data.gameName);
        if (currentSocket?.connected) {
            this.setClientSocket(client.id, data.gameName, client);
        } else {
            const socket = this.setupViewSocket(client, data.gameName, data.serviceName);

            if (socket) {
                this.setClientSocket(client.id, data.gameName, client);
                this.handleViewSocketEvents(data.gameName, socket);
                this.setViewSocket(data.gameName, socket);
            } else {
                client.emit(data.gameName, { errorCode: this.FailedConnectionErrorCode });
                this.logService.log("Cannot open socket", [data.gameName, data.session.username]);
            }
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("signin")
    signin(@MessageBody() data: any, @ConnectedSocket() client: any) {
        if (!data?.gameName || !data?.session) {
            return;
        }

        const gameSocket = this.getGameSocket(client.id, data.gameName);
        if (gameSocket?.connected) {
            gameSocket.emit("inGame", null);
        } else {
            const socket = this.setupGameSocket(client, data.gameName, data.serviceName);
            if (socket) {
                this.setGameSocket(client.id, data.gameName, socket);
                this.handleGameSocketEvents(client, data.gameName, socket);
                socket.emit("signin");
            } else {
                client.emit(data.gameName, { errorCode: this.FailedConnectionErrorCode });
                this.logService.log("Cannot open socket", [data.gameName, data.session.username]);
            }
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("bet")
    placingBet(@MessageBody() data: any, @ConnectedSocket() client: any) {
        if (!data?.gameName) {
            return;
        }

        const socket = this.getGameSocket(client.id, data.gameName);

        if (socket?.connected) {
            socket.emit("bet", data.betData);
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("outGame")
    outGame(@MessageBody() gameName: string, @ConnectedSocket() client: any) {
        if (!gameName) {
            return;
        }

        const socket = this.getGameSocket(client.id, gameName);

        if (socket?.connected) {
            socket.disconnect();
            this.setClientSocket(client.id, gameName, null);
            this.setGameSocket(client.id, gameName, null);
        }
    }

    private getGameSocket(clientId: string, gameName: string) {
        return this.clientSockets[clientId]?.[gameName];
    }

    private getViewSocket(gameName: string) {
        return this.viewSockets[gameName];
    }

    private setViewSocket(gameName: string, socket: Socket) {
        this.viewSockets[gameName] = socket;
    }

    private setClientSocket(clientId: any, gameName: string, socket: Socket) {
        if (this.clientSockets[clientId]) {
            this.clientSockets[clientId][gameName] = socket;
        }
    }

    private setGameSocket(clientId: string, gameName: string, socket: Socket) {
        if (this.gameSockets[clientId]) {
            this.gameSockets[clientId][gameName] = socket;
        }
    }

    private formatServiceUri(serviceUri: string, gameName: string): string {
        return `${serviceUri}/user/${gameName.toLowerCase()}`;
    }

    private getSocketUri(gameName: string, serviceName: string): string {
        if (serviceName) {
            const serviceUrlPattern = this.configService.get<string>("serviceUrlPattern");
            const serviceNameSeparator = this.configService.get<string>("serviceNameSeparator");
            return this.formatServiceUri(serviceUrlPattern.replace("{0}", serviceName.replace(/-|_|\s/g, serviceNameSeparator)), gameName);
        }

        return this.socketUris[gameName.trim().toLowerCase()];
    }

    private initSocketOptions(origin: string, userAgent: string): Partial<ManagerOptions & SocketOptions> {
        const options: Partial<ManagerOptions & SocketOptions> = {
            forceNew: true,
            transports: ["websocket"],
            upgrade: false,
            extraHeaders: {
                "user-agent": userAgent,
                origin: origin,
            },
        };
        if (this.enabledMsgpack) {
            options.parser = MsgpackParser;
        }
        return options;
    }

    private handleViewSocketEvents(gameName: string, socket: Socket) {
        socket.on(gameName, (data: any) => {
            try {
                Object.keys(data).forEach((key: string) => {
                    if (this.viewEvents.includes(key)) {
                        this.publishToAllPlayers(gameName, data);
                        return;
                    }
                    if (this.clientSockets[key]) {
                        this.publishToPlayer(key, gameName, data);
                    }
                });
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        socket.on("connect_error", (error: any) => {
            try {
                this.logService.error(error);
                socket.close();
                this.publishToAllPlayers(gameName, { errorCode: this.FailedConnectionErrorCode });
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        socket.on("disconnect", () => {
            try {
                this.publishToAllPlayers(gameName, { errorCode: this.FailedConnectionErrorCode });
            } catch (ex) {
                this.logService.error(ex);
            }
        });
    }

    private setupViewSocket(client: any, gameName: string, serviceName: string) {
        const socketUri = this.getSocketUri(gameName, serviceName).replace("/user/", "/view/");

        if (socketUri === undefined) {
            return null;
        }

        const options = this.initSocketOptions("", client.request.headers["user-agent"]);
        return io(socketUri, options);
    }

    private handleGameSocketEvents(client: any, gameName: string, socket: Socket) {
        socket.on("signedIn", () => {
            socket.emit("inGame", null);
        });
        socket.on(gameName, (data: any) => {
            try {
                if (data.gameConfigs && !data.snr) {
                    client.emit(gameName, { gameConfigs: data.gameConfigs });
                    return;
                }
                Object.keys(data).some((key) => this.playerEvents.includes(key)) && client.emit(gameName, data);
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        socket.on("message", (data: any) => {
            try {
                client.emit("message", { ...data, gameName });
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        socket.on("connect_error", (error: any) => {
            try {
                this.logService.error(error);
                socket.close();
                client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        socket.on("disconnect", () => {
            try {
                client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            } catch (ex) {
                this.logService.error(ex);
            }
        });
    }

    private setupGameSocket(client: any, gameName: string, serviceName: string) {
        const socketUri = this.getSocketUri(gameName, serviceName);

        if (socketUri === undefined) {
            return null;
        }

        const options = this.initSocketOptions(client.request.headers["origin"], client.request.headers["user-agent"]);
        return io(socketUri, options);
    }

    private publishToAllPlayers(gameName: string, data: any) {
        Object.values(this.clientSockets).forEach((clientSocket) => {
            const socket = clientSocket[gameName];
            socket?.emit(gameName, data);
        });
    }

    private publishToPlayer(clientId: string, gameName: string, data: any) {
        if (this.clientSockets[clientId]) {
            this.clientSockets[clientId][gameName]?.emit(gameName, data);
        }
    }
}
