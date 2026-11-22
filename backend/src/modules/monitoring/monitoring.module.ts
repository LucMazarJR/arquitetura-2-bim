import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ApiTokenGuard } from "./api-token.guard";
import { HealthController } from "./health.controller";
import { LiveGateway } from "./live.gateway";
import { monitoringConfig } from "./monitoring.config";
import { MonitoringController } from "./monitoring.controller";
import { MonitoringService } from "./monitoring.service";
import { ReadModel } from "./read-model";

@Module({
  imports: [ConfigModule.forFeature(monitoringConfig)],
  controllers: [HealthController, MonitoringController],
  providers: [MonitoringService, ReadModel, LiveGateway, ApiTokenGuard],
})
export class MonitoringModule {}
