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
    ) {}

    afterInit(server: any) {
        this.socketIOMetrics = prometheus.metrics(server, {
            collectDefaultMetrics: true,
            checkForNewNamespaces: false,
        });
    }

    getSocketMetrics(): string {
        return this.socketIOMetrics.register.metrics();
    }

    handleConnection(client: any) {
        this.clientConnectionService.init(client.id);
        this.playConnectionService.init(client.id);
    }

    handleDisconnect(client: any) {
        this.clientConnectionService.disconnect(client.id);
        this.playConnectionService.disconnect(client.id);
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("joinGame")
    async joinGame(@MessageBody() data: any, @ConnectedSocket() client: any) {
        if (!data?.gameName || !data?.session) {
            return;
        }

        const { ss, username } = data.session;
        const browserUserAgent = client.request?.headers?.["user-agent"];
        const validSession = await this.userService.verifyUserSession(ss, username, browserUserAgent);
        if (!validSession) {
            client.emit("message", { gameName: data.gameName, unauthorized: true });
            return;
        }

        const clientId = client.id;
        const { gameName } = data;

        const viewSocket = this.viewConnectionService.getOrCreateSocket(client, data);
        if (viewSocket) {
            this.clientConnectionService.setSocket(clientId, gameName, client);
            viewSocket.connected && this.viewConnectionService.inGame(clientId, gameName);
        } else {
            client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            this.logService.log("Cannot open socket", [gameName, data.session.username]);
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("signin")
    signin(@MessageBody() data: any, @ConnectedSocket() client: any) {
        if (!data?.gameName || !data?.session) {
            return;
        }

        const clientId = client.id;
        const { gameName } = data;

        const playSocket = this.playConnectionService.getOrCreateSocket(client, data);
        if (playSocket) {
            this.clientConnectionService.setSocket(clientId, gameName, client);
            playSocket.connected && this.playConnectionService.inGame(clientId, gameName);
        } else {
            client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
            this.logService.log("Cannot open socket", [gameName, data.session.username]);
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("bet")
    placingBet(@MessageBody() data: any, @ConnectedSocket() client: any) {
        if (!data?.gameName || !data?.betData) {
            return;
        }

        this.playConnectionService.placeBet(client.id, data);
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("outGame")
    outGame(@MessageBody() gameName: string, @ConnectedSocket() client: any) {
        if (!gameName) {
            return;
        }
        const clientId = client.id;
        const socket = this.playConnectionService.getSocket(clientId, gameName);

        if (socket?.connected) {
            socket.disconnect();
            this.playConnectionService.setSocket(clientId, gameName, null);
        }

        this.clientConnectionService.setSocket(clientId, gameName, null);
    }
}
