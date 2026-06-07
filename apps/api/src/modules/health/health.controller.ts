import { Controller, Get } from "@nestjs/common";

/** Liveness probe. `GET /health` returns a simple ok status. */
@Controller("health")
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }
}
