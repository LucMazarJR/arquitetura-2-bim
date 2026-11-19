import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { forecastConfig } from "./forecast.config";
import { ForecastRepository } from "./forecast.repository";
import { ForecastService } from "./forecast.service";

@Module({
  imports: [ConfigModule.forFeature(forecastConfig)],
  providers: [ForecastService, ForecastRepository],
})
export class ForecastModule {}
