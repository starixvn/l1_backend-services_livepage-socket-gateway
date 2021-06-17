import { CounterMetric, GaugeMetric, PromService } from "@digikare/nestjs-prom";
import { UseInterceptors } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { RavenInterceptor } from "nest-raven";
import { Server, Socket } from "socket.io";
import * as io from "socket.io-client";

@WebSocketGateway({ transports: ['websocket'] })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private clients = {};
    private readonly connectTotal: CounterMetric;
    private readonly disconnectTotal: CounterMetric;
    private readonly connectedSockets: GaugeMetric;

    @WebSocketServer()
    server: Server;

    constructor(private readonly configService: ConfigService, private readonly promService: PromService) {
        this.connectedSockets = promService.getGauge({
            name: 'socket_io_connected',
            help: 'Number of currently connected sockets',
        });

        this.connectTotal = promService.getCounter({
            name: 'socket_io_connect_total',
            help: 'Total count of socket.io connection requests',
        });

        this.disconnectTotal = promService.getCounter({
            name: 'socket_io_disconnect_total',
            help: 'Total count of socket.io disconnections',
        });
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.clients[client.id] = {};
        this.connectTotal.inc();
        this.connectedSockets.set((this.server.engine as any).clientsCount);
    }

    handleDisconnect(client: Socket) {
        const sockets = this.clients[client.id];
        Object.values(sockets).forEach((socket: SocketIOClient.Socket) => {
            socket.disconnect();
        });

        setTimeout(() => {
            delete this.clients[client.id];
        });

        this.disconnectTotal.inc();
        this.connectedSockets.set((this.server.engine as any).clientsCount);
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage('signIn')
    signIn(client: Socket, data: any) {
        const socket = this.connectSocket(client, data.gameName, data.session);
        socket.on('signedIn', () => {
            const sockets = this.clients[client.id];
            sockets[data.gameName] = socket;
            this.server.emit(data.gameName, { signedIn: true });
        });
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage('inGame')
    inGame(client: Socket, gameName: string) {
        const socket = this.getGameSocket(client.id, gameName);

        if (socket && socket.connected) {
            socket.emit('inGame');
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage('bet')
    placingBet(client: Socket, data: any) {
        const socket = this.getGameSocket(client.id, data.gameName);
        if (socket && socket.connected) {
            socket.emit('bet', data.betData);
        }
    }

    private connectSocket(client: Socket, gameName: string, session: any) {
        const socketUri = this.configService.get<string>(`services.${gameName}`);
        const options = {
            forceNew: true,
            transports: ['websocket'],
            upgrade: false,
            extraHeaders: {
                'user-agent': client.request.headers['user-agent'],
            },
        };
        const socket = io(socketUri, options);

        socket.on('connect', () => {
            console.log('connected');
            socket.emit('signin', session);
        });

        socket.on(gameName, (data) => {
            this.server.emit(gameName, data);
        });

        return socket;
    }

    private getGameSocket(clientId: string, gameName: string) {
        return this.clients[clientId]?.[gameName];
    }
}
