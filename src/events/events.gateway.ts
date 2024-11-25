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
// import { UserService } from "./../common/user.service";

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
        // private readonly userService: UserService,
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
    joinGame(@MessageBody() data: any, @ConnectedSocket() client: any) {
        if (!data?.gameName || !data?.session) {
            return;
        }
        // TODO: verify session

        const clientId = client.id;
        const { gameName } = data;

        const viewSocket = this.viewConnectionService.getSocket(clientId, gameName);
        if (viewSocket?.connected) {
            this.clientConnectionService.setSocket(clientId, gameName, client);
            this.viewConnectionService.inGame(clientId, gameName);
        } else {
            const socket = this.viewConnectionService.setupSocket(client, data);

            if (socket) {
                this.clientConnectionService.setSocket(clientId, gameName, client);
                this.viewConnectionService.setSocket(clientId, gameName, socket);
            } else {
                client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
                this.logService.log("Cannot open socket", [gameName, data.session.username]);
            }
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

        const gameSocket = this.playConnectionService.getSocket(clientId, gameName);
        if (gameSocket?.connected) {
            this.clientConnectionService.setSocket(client.id, gameName, client);
            this.playConnectionService.inGame(clientId, gameName);
            gameSocket.emit("inGame", null);
        } else {
            const socket = this.playConnectionService.setupSocket(client, data);

            if (socket) {
                this.clientConnectionService.setSocket(client.id, gameName, client);
                this.playConnectionService.setSocket(clientId, gameName, socket);
            } else {
                client.emit(gameName, { errorCode: this.FailedConnectionErrorCode });
                this.logService.log("Cannot open socket", [gameName, data.session.username]);
            }
        }
    }

    @UseInterceptors(new RavenInterceptor())
    @SubscribeMessage("bet")
    placingBet(@MessageBody() data: any, @ConnectedSocket() client: any) {
        if (!data?.gameName) {
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
            this.clientConnectionService.setSocket(clientId, gameName, null);
            this.playConnectionService.setSocket(clientId, gameName, null);
        }
    }
}
