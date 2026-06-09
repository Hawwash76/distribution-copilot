import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { configuration } from "./config/configuration";
import { AccountModule } from "./modules/account/account.module";
import { AuthModule } from "./modules/auth/auth.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { HealthModule } from "./modules/health/health.module";
import { OpportunitiesModule } from "./modules/opportunities/opportunities.module";
import { ProductsModule } from "./modules/products/products.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HealthModule,
    AuthModule,
    AccountModule,
    ProductsModule,
    DiscoveryModule,
    OpportunitiesModule,
  ],
})
export class AppModule {}
