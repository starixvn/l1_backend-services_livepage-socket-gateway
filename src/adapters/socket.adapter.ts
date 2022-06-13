import { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Server } from "socket.io";
import * as MsgpackParser from "socket.io-msgpack-parser";

export class SocketIoAdapter extends IoAdapter {
    constructor(private readonly configService: ConfigService, appOrHttpServer?: INestApplicationContext | any) {
        super(appOrHttpServer);

        this.configService = configService;
    }

    createIOServer(port: number, options?: any) {
        const enabledMsgPack = this.configService.get("enabledMsgPack");

        const socketOptions = {
            ...options,
            parser: enabledMsgPack ? MsgpackParser : undefined,
        };

        return super.createIOServer(port, socketOptions);
    }
}
