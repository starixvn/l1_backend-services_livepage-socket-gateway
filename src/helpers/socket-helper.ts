import { Server } from "socket.io";
import io from "socket.io-client";

export const connectSocket = ({ gameName, session }: any, server: Server) => {
    const socket = io('http://localhost:8082/user/xocxoc', {
        forceNew: true,
        transports: ['websocket'],
        upgrade: false,
    });

    socket.on('connect', () => {
        socket.emit('signin', session);
    });

    socket.on(gameName, (data) => {
        server.emit(gameName, data);
    });

    return socket;
};
