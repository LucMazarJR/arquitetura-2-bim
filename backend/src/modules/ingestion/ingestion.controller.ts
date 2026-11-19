import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, MqttContext, Payload } from "@nestjs/microservices";
import { IngestionService } from "./ingestion.service";

export const READING_TOPIC = "$share/ingestion/energy/+/+/reading";

@Controller()
export class IngestionController {
  constructor(private readonly ingestion: IngestionService) {}

  @EventPattern(READING_TOPIC)
  async onReading(@Payload() payload: unknown, @Ctx() context: MqttContext) {
    await this.ingestion.handleMessage(context.getTopic(), payload);
  }
}
