import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AlertRepository } from "./alert.repository";
import { analysisConfig, type AnalysisConfig } from "./analysis.config";
import { AnalysisService } from "./analysis.service";
import { defaultRules, RULES } from "./rules";

@Module({
  imports: [ConfigModule.forFeature(analysisConfig)],
  providers: [
    AnalysisService,
    AlertRepository,
    {
      provide: RULES,
      inject: [analysisConfig.KEY],
      useFactory: (config: AnalysisConfig) => defaultRules(config),
    },
  ],
})
export class AnalysisModule {}
