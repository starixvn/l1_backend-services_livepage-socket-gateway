import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { ExceptionsFilter } from "./common/exceptions.filter";
import { CustomLogger } from "./common/logger.service";

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
    const customLogger = app.get<CustomLogger>(CustomLogger);

    app.useLogger(customLogger);
    app.useGlobalFilters(new ExceptionsFilter(customLogger));

    await app.listen(5000, "0.0.0.0");
    console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
