import { UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import * as Sentry from "@sentry/node";
import { RavenInterceptor } from "nest-raven";
import { Server, Socket } from "socket.io";
import * as io from "socket.io-client";
import * as prometheus from "socket.io-prom-metrics";

@WebSocketGateway({
    transports: ["websocket"],
    pingInterval: 60 * 1000,
    pingTimeout: 60 * 1000,
    allowUpgrades: false,
    allowEIO3: true,
})

export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private clients = {};
    private socketIOMetrics;
    private socketUris = {};

    @WebSocketServer()
    server: Server;

    constructor(private readonly configService: ConfigService) {}

    afterInit(server: Server) {
        this.socketIOMetrics = prometheus.metrics(server, {
            collectDefaultMetrics: true,
            checkForNewNamespaces: false,
        });

        this.socketUris = this.configService.get<string>("services");
        console.log(this.socketUris);
    }

    getSocketMetrics() {
        return this.socketIOMetrics.register.metrics();
    }

    handleConnection(client: Socket) {
        this.clients[client.id] = {};
        Sentry.captureMessage(`new client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        const sockets = this.clients[client.id];
        Object.values(sockets).forEach((socket: Socket) => {
            socket.disconnect();
        });

        setTimeout(() => {
            delete this.clients[client.id];
        });
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("signIn")
    signIn(client: Socket, data: any) {
        const socket = this.connectSocket(client, data.gameName, data.session);

        if (socket) {
            socket.on("signedIn", () => {
                const sockets = this.clients[client.id];
                sockets[data.gameName] = socket;
                client.emit(data.gameName, { signedIn: true });
            });
        } else {
            client.emit(data.gameName, { error: "cannot open socket" });
            Sentry.captureMessage(`cannot open socket for : ${data.gameName}, username ${data.session.username}`);
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("inGame")
    inGame(client: Socket, gameName: string) {
        const socket = this.getGameSocket(client.id, gameName);

        if (socket && socket.connected) {
            socket.emit("inGame");
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("bet")
    placingBet(client: Socket, data: any) {
        const socket = this.getGameSocket(client.id, data.gameName);
        if (socket && socket.connected) {
            socket.emit("bet", data.betData);
        }
    }

    private connectSocket(client: Socket, gameName: string, session: any) {
        const socketUri = this.socketUris[gameName.trim()];

        if (socketUri !== undefined) {
            return null;
        }

        const options = {
            forceNew: true,
            transports: ["websocket"],
            upgrade: false,
            extraHeaders: {
                "user-agent": client.request.headers["user-agent"],
            },
        };
        const socket = io(socketUri, options);

        socket.on("connect", () => {
            socket.emit("signin", session);
        });

        socket.on(gameName, (data) => {
            client.emit(gameName, data);
        });

        socket.on("connect_error", (error) => {
            //TODO clean socket
            Sentry.captureException(error);
        });

        //TODO handle disconnect

        return socket;
    }

    private getGameSocket(clientId: string, gameName: string) {
        return this.clients[clientId]?.[gameName];
    }
}
