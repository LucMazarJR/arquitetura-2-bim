import { Module } from "@nestjs/common";
import { IngestionController } from "./ingestion.controller";
import { IngestionService } from "./ingestion.service";
import { ReadingRepository } from "./reading.repository";

@Module({
  controllers: [IngestionController],
  providers: [IngestionService, ReadingRepository],
})
export class IngestionModule {}
