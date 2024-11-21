import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
    @Get()
    getHello(): string {
        return "Hello, I am Live page gateway";
    }

    @Get("health")
    healthCheck(): string {
        return "Live page gateway is OK";
    }
}
