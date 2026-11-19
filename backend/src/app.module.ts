import { DynamicModule, Module, Type } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AnalysisModule } from "./modules/analysis/analysis.module";
import { ForecastModule } from "./modules/forecast/forecast.module";
import { IngestionModule } from "./modules/ingestion/ingestion.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { PlatformModule } from "./platform/adapters/platform.module";

const FEATURE_MODULES: Record<string, Type> = {
  ingestion: IngestionModule,
  analysis: AnalysisModule,
  forecast: ForecastModule,
  notification: NotificationModule,
  monitoring: MonitoringModule,
};

export const ALL_MODULES = Object.keys(FEATURE_MODULES);

@Module({})
export class AppModule {
  static register(names: string[]): DynamicModule {
    const unknown = names.filter((name) => !FEATURE_MODULES[name]);
    if (unknown.length > 0) throw new Error(`Unknown modules: ${unknown.join(", ")}`);

    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PlatformModule,
        ...names.map((name) => FEATURE_MODULES[name]),
      ],
    };
  }
}
