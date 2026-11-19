import { Module } from "@nestjs/common";
import { LiveGateway } from "./live.gateway";
import { MonitoringController } from "./monitoring.controller";
import { MonitoringService } from "./monitoring.service";
import { ReadModel } from "./read-model";

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, ReadModel, LiveGateway],
})
export class MonitoringModule {}
