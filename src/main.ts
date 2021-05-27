import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import * as Sentry from "@sentry/node";

import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get<ConfigService>(ConfigService);

    Sentry.init({ dsn: configService.get<string>('sentry.dsn') });
    Sentry.captureMessage(`Logger started at ${new Date()}`);

    await app.listen(5000);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
