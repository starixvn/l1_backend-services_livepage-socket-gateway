import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
    @Get()
    getHello(): string {
        return "Hello, I am socket gateway";
    }

    @Get("health")
    healthCheck(): string {
        return "I am socket gateway";
    }
}
