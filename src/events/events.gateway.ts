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
import * as io from "socket.io-client";
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
    private clients = {};
    private socketIOMetrics: prometheus.SocketIOMetrics;
    private socketUris = {};

    @WebSocketServer()
    server: any;

    constructor(private readonly configService: ConfigService, private readonly logService: CustomLogger) {}

    afterInit(server: any) {
        this.socketIOMetrics = prometheus.metrics(server, {
            collectDefaultMetrics: true,
            checkForNewNamespaces: false,
        });

        this.socketUris = this.configService.get<string>("services");
        console.log(this.socketUris);
    }

    getSocketMetrics(): string {
        return this.socketIOMetrics.register.metrics();
    }

    handleConnection(client: any) {
        this.clients[client.id] = {};
    }

    handleDisconnect(client: any) {
        const sockets = this.clients[client.id];

        Object.values(sockets).forEach((socket: any) => {
            socket.disconnect();
            socket.close();
        });

        setTimeout(() => {
            delete this.clients[client.id];
        });
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("signIn")
    signIn(@MessageBody() data: any, @ConnectedSocket() client: any) {
        const socket = this.connectSocket(client, data.gameName, data.session);

        if (socket) {
            socket.on("signedIn", () => {
                if (this.clients[client.id]) {
                    this.setGameSocket(client.id, data.gameName, socket);
                    client.emit(data.gameName, { signedIn: true });
                }
            });
        } else {
            client.emit(data.gameName, { errorCode: this.FailedConnectionErrorCode });
            this.logService.log("Cannot open socket", [data.gameName, data.session.username]);
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("inGame")
    inGame(@MessageBody() gameName: string, @ConnectedSocket() client: any) {
        const socket = this.getGameSocket(client.id, gameName);

        if (socket?.connected) {
            socket.emit("inGame");
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("bet")
    placingBet(@MessageBody() data: any, @ConnectedSocket() client: any) {
        const socket = this.getGameSocket(client.id, data.gameName);

        if (socket?.connected) {
            socket.emit("bet", data.betData);
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("outGame")
    outGame(@MessageBody() gameName: string, @ConnectedSocket() client: any) {
        const socket = this.getGameSocket(client.id, gameName);

        if (socket?.connected) {
            socket.disconnect();
            this.setGameSocket(client.id, gameName, null);
        }
    }

    private connectSocket(client: any, gameName: string, session: any): SocketIOClient.Socket {
        const socketUri = this.socketUris[gameName.trim().toLowerCase()];

        if (socketUri === undefined) {
            return null;
        }

        const options = {
            forceNew: true,
            transports: ["websocket"],
            upgrade: false,
            extraHeaders: {
                "user-agent": client.request.headers["user-agent"],
                origin: client.request.headers["origin"],
            },
        };
        const gameSocket = io(socketUri, options);

        gameSocket.on("connect", () => {
            try {
                gameSocket.emit("signin", session);
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        gameSocket.on(gameName, (data: any) => {
            try {
                client.emit(gameName, data);
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        gameSocket.on("connect_error", (error: any) => {
            try {
                this.logService.error(error);
                gameSocket.close();
                client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        gameSocket.on("disconnect", () => {
            try {
                gameSocket.close();
                this.setGameSocket(client.id, gameName, null);
                client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            } catch (ex) {
                this.logService.error(ex);
            }
        });

        return gameSocket;
    }

    private getGameSocket(clientId: string, gameName: string) {
        return this.clients[clientId]?.[gameName.trim().toLowerCase()];
    }

    private setGameSocket(clientId: string, gameName: string, socket: SocketIOClient.Socket) {
        this.clients[clientId][gameName.trim().toLowerCase()] = socket;
    }

    public getClients() {
        return this.clients;
    }
}
