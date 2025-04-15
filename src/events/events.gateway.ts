import { UseInterceptors } from "@nestjs/common";
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
import * as prometheus from "socket.io-prom-metrics";
import { CustomLogger } from "./../common/logger.service";
import { ClientConnectionService, PlayConnectionService, ViewConnectionService } from "./connections";
import { UserService } from "./../common/user.service";

@WebSocketGateway({
    transports: ["websocket"],
    pingInterval: 60 * 1000,
    pingTimeout: 60 * 1000,
    allowUpgrades: false,
    allowEIO3: true,
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
    private socketIOMetrics: prometheus.SocketIOMetrics;
    private readonly FailedConnectionErrorCode = "SB0010";

    @WebSocketServer()
    server: any;

    constructor(
        private readonly logService: CustomLogger,
        private readonly viewConnectionService: ViewConnectionService,
        private readonly playConnectionService: PlayConnectionService,
        private readonly clientConnectionService: ClientConnectionService,
        private readonly userService: UserService,
    ) { }

    afterInit(server: any) {
        this.socketIOMetrics = prometheus.metrics(server, {
            collectDefaultMetrics: true,
            checkForNewNamespaces: false,
        });
        console.log('WebSocket gateway initialized');
    }

    getSocketMetrics(): string {
        console.log('Socket metrics requested');
        return this.socketIOMetrics.register.metrics();
    }

    handleConnection(client: any) {
        console.log(`Client connected: ${client.id}`);
        this.clientConnectionService.init(client.id);
        this.playConnectionService.init(client.id);
    }

    handleDisconnect(client: any) {
        console.log(`Client disconnected: ${client.id}`);
        this.clientConnectionService.disconnect(client.id);
        this.playConnectionService.disconnect(client.id);
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("joinGame")
    async joinGame(@MessageBody() data: any, @ConnectedSocket() client: any) {
        console.log(`Join game request: ${JSON.stringify({ clientId: client.id, gameName: data?.gameName, username: data?.session?.username })}`);
        if (!data?.gameName || !data?.session) {
            console.log(`Join game rejected: Missing data for client ${client.id}`);
            return;
        }

        const { ss, username } = data.session;
        const browserUserAgent = client.request?.headers?.["user-agent"];
        console.log(`Verifying session for user: ${username}`);
        const validSession = await this.userService.verifyUserSession(ss, username, browserUserAgent);
        if (!validSession) {
            console.log(`Authentication failed for user: ${username}`);
            client.emit("message", { gameName: data.gameName, unauthorized: true });
            return;
        }

        const clientId = client.id;
        const { gameName } = data;
        console.log(`User ${username} authenticated for game: ${gameName}`);

        const viewSocket = this.viewConnectionService.getOrCreateSocket(client, data);
        if (viewSocket) {
            this.clientConnectionService.setSocket(clientId, gameName, client);
            if (viewSocket.connected) {
                console.log(`User ${username} successfully joined game: ${gameName}`);
                this.viewConnectionService.inGame(clientId, gameName);
            }
        } else {
            console.log(`Failed to create view socket for game: ${gameName}, user: ${username}`);
            client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            this.logService.log("Cannot open socket", [gameName, data.session.username]);
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("signin")
    signin(@MessageBody() data: any, @ConnectedSocket() client: any) {
        console.log(`Signin request: ${JSON.stringify({ clientId: client.id, gameName: data?.gameName, username: data?.session?.username })}`);
        if (!data?.gameName || !data?.session) {
            console.log(`Signin rejected: Missing data for client ${client.id}`);
            return;
        }

        const clientId = client.id;
        const { gameName } = data;

        const playSocket = this.playConnectionService.getOrCreateSocket(client, data);
        if (playSocket) {
            this.clientConnectionService.setSocket(clientId, gameName, client);
            if (playSocket.connected) {
                console.log(`Client ${clientId} successfully signed in to game: ${gameName}`);
                this.playConnectionService.inGame(clientId, gameName);
            }
        } else {
            console.log(`Failed to create play socket for game: ${gameName}, client: ${clientId}`);
            client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            this.logService.log("Cannot open socket", [gameName, data.session.username]);
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("bet")
    placingBet(@MessageBody() data: any, @ConnectedSocket() client: any) {
        console.log(`Bet request: ${JSON.stringify({ clientId: client.id, gameName: data?.gameName, betAmount: data?.betData?.amount })}`);
        if (!data?.gameName || !data?.betData) {
            console.log(`Bet rejected: Missing data for client ${client.id}`);
            return;
        }

        console.log(`Processing bet for client ${client.id} in game ${data.gameName}`);
        this.playConnectionService.placeBet(client.id, data);
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("outGame")
    outGame(@MessageBody() gameName: string, @ConnectedSocket() client: any) {
        console.log(`Out game request: ${JSON.stringify({ clientId: client.id, gameName })}`);
        if (!gameName) {
            console.log(`Out game rejected: Missing game name for client ${client.id}`);
            return;
        }
        const clientId = client.id;
        const socket = this.playConnectionService.getSocket(clientId, gameName);

        if (socket?.connected) {
            console.log(`Disconnecting client ${clientId} from game ${gameName}`);
            socket.disconnect();
            this.playConnectionService.setSocket(clientId, gameName, null);
        }

        console.log(`Removing socket for client ${clientId} from game ${gameName}`);
        this.clientConnectionService.setSocket(clientId, gameName, null);
    }
}
