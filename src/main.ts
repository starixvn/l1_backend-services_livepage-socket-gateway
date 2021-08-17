import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { CustomLogger } from "./common/logger.service";
import { ExceptionsFilter } from "./filters/exceptions.filter";

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
    const configService = app.get<ConfigService>(ConfigService);

    app.useLogger(new CustomLogger(configService));
    app.useGlobalFilters(new ExceptionsFilter());

    await app.listen(5000, "0.0.0.0");
    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
