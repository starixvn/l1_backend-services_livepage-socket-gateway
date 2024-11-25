import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { SocketIoAdapter } from "./adapters/socket.adapter";

import { AppModule } from "./app.module";
import { ExceptionsFilter } from "./common/exceptions.filter";
import { CustomLogger } from "./common/logger.service";
import UserServiceClient from "./common/user-service-client";

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
    const customLogger = app.get<CustomLogger>(CustomLogger);
    const configService = app.get<ConfigService>(ConfigService);

    UserServiceClient.init(configService);
    app.useWebSocketAdapter(new SocketIoAdapter(configService, app));
    app.useLogger(customLogger);
    app.useGlobalFilters(new ExceptionsFilter(customLogger));

    await app.listen(5000, "0.0.0.0");
    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
