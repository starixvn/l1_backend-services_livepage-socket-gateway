import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { RavenInterceptor } from "nest-raven";

import configuration from "./config/configuration";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), EventsModule, HealthModule],
    providers: [{ provide: APP_INTERCEPTOR, useValue: new RavenInterceptor() }],
})
export class AppModule {}
