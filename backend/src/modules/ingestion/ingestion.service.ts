import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createEvent, type ReadingRecordedEvent } from "../../contracts/events";
import { EventBus } from "../../platform/ports";
import { ReadingRepository } from "./reading.repository";
import { parseTopic, translate } from "./translator";
import { validateReading } from "./validator";

export type MessageResult = "recorded" | "duplicate" | "rejected";

@Injectable()
export class IngestionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IngestionService.name);
  private recordedCount = 0;
  private summaryTimer?: NodeJS.Timeout;

  constructor(
    private readonly bus: EventBus,
    private readonly repository: ReadingRepository,
  ) {}

  onModuleInit() {
    this.summaryTimer = setInterval(() => {
      this.logger.log(`${this.recordedCount} readings recorded in the last 15s`);
      this.recordedCount = 0;
    }, 15_000);
  }

  onModuleDestroy() {
    clearInterval(this.summaryTimer);
  }

  async handleMessage(topic: string, payload: unknown): Promise<MessageResult> {
    const origin = parseTopic(topic);
    if (!origin) return this.reject(topic, "unexpected topic");

    const validation = validateReading(payload, new Date());
    if (!validation.valid) return this.reject(topic, validation.reason);

    const reading = translate(origin, validation.reading);
    const isNew = await this.repository.save(reading);
    if (!isNew) return "duplicate";

    await this.bus.publish("readings", createEvent<ReadingRecordedEvent>("reading.recorded", reading, "ingestion"));
    this.recordedCount++;
    return "recorded";
  }

  private reject(topic: string, reason: string): MessageResult {
    this.logger.warn(`reading rejected on ${topic}: ${reason}`);
    return "rejected";
  }
}
