import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { configuration } from "./config/configuration";
import { AuthModule } from "./modules/auth/auth.module";
import { BillingModule } from "./modules/billing/billing.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { HealthModule } from "./modules/health/health.module";
import { MonitorsModule } from "./modules/monitors/monitors.module";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module";
import { ProductsModule } from "./modules/products/products.module";
import { StatsModule } from "./modules/stats/stats.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    // Global rate limit: 120 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    HealthModule,
    AuthModule,
    ProductsModule,
    DiscoveryModule,
    MonitorsModule,
    OpportunitiesModule,
    StatsModule,
    BillingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
