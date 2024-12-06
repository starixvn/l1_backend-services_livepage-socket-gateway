import { Injectable } from "@nestjs/common";
import { Socket } from "socket.io-client";

@Injectable()
export class ClientConnectionService {
    private sockets: { [clientId: string]: { [gameName: string]: Socket } } = {};
    init(clientId: string) {
        this.sockets[clientId] = {};
    }

    setSocket(clientId: string, gameName: string, socket: Socket) {
        if (this.sockets[clientId]) {
            this.sockets[clientId][gameName] = socket;
        }
    }

    disconnect(clientId: string) {
        if (!this.sockets[clientId]) {
            return;
        }
        const sockets = this.sockets[clientId];
        Object.values(sockets).forEach((socket: any) => {
            socket?.disconnect();
        });
        setTimeout(() => {
            delete this.sockets[clientId];
        }, 0);
    }

    publishToAllPlayers(gameName: string, data: any) {
        Object.values(this.sockets).forEach((clientSocket) => {
            const socket = clientSocket[gameName];
            socket?.emit(gameName, data);
        });
    }

    publishToPlayer(clientId: string, gameName: string, data: any) {
        if (this.sockets[clientId]) {
            this.sockets[clientId][gameName]?.emit(gameName, data);
        }
    }

    getSocket(clientId: string, gameName: string): Socket {
        if (this.sockets[clientId]) {
            return this.sockets[clientId][gameName];
        }
        return null;
    }
}
