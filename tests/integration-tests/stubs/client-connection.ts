import { browserUserAgent } from "./data";

export class GameClientDriver {
    private readonly socket: any;
    private readonly gameName: string;

    constructor({ io, gameName, socketUri }) {
        this.socket = io(socketUri, {
            transports: ["websocket"],
            upgrade: false,
            forceNew: true,
            extraHeaders: {
                "user-agent": browserUserAgent,
            },
        });
        this.gameName = gameName;
    }

    getSocket() {
        return this.socket;
    }

    close() {
        this.socket?.close();
    }

    async handleGameEvent(complete) {
        return this.waitForEvent(this.gameName, complete);
    }

    on(eventName, eventHandler) {
        this.socket.on(eventName, eventHandler);
    }

    off(eventName) {
        this.socket.off(eventName);
    }

    once(eventName, eventHandler) {
        this.socket.once(eventName, eventHandler);
    }

    removeListener(eventName, handler) {
        this.socket.removeListener(eventName, handler);
    }

    async handleJoinedGame() {
        return this.handleGameEvent((data) => data.gameConfigs);
    }

    async waitForEvent(eventName, completeCondition): Promise<any> {
        return new Promise((resolve) => {
            this.socket.on(eventName, (result) => {
                if (!completeCondition || completeCondition(result)) {
                    resolve(result);
                }
            });
        });
    }

    emit(eventName, ...args) {
        if (args.length) {
            this.socket.emit(eventName, ...args);
        } else {
            this.socket.emit(eventName);
        }
    }
}
