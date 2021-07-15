import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from "@nestjs/terminus";

@Controller("health")
export class HealthController {
    constructor(private readonly health: HealthCheckService, private readonly memory: MemoryHealthIndicator) {}

    @Get()
    @HealthCheck()
    healthCheck() {
        return this.health.check([
            async () => this.memory.checkHeap("memory_heap", 200 * 1024 * 1024),
            async () => this.memory.checkRSS("memory_rss", 3000 * 1024 * 1024),
        ]);
    }
}
