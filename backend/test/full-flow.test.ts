import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import type { AlertRaised } from "../src/contracts/events";
import { AnalysisModule } from "../src/modules/analysis/analysis.module";
import { ForecastModule } from "../src/modules/forecast/forecast.module";
import { IngestionModule } from "../src/modules/ingestion/ingestion.module";
import { IngestionService } from "../src/modules/ingestion/ingestion.service";
import { CHANNELS, type Channel } from "../src/modules/notification/channels";
import { NotificationModule } from "../src/modules/notification/notification.module";
import { MemoryCache } from "../src/platform/adapters/memory-cache";
import { MemoryEventBus } from "../src/platform/adapters/memory-event-bus";
import { Cache, Database, EventBus } from "../src/platform/ports";
import { createFakeDatabase, devicePayload } from "./support";

const bus = new MemoryEventBus();

@Global()
@Module({
  providers: [
    { provide: EventBus, useValue: bus },
    { provide: Cache, useValue: new MemoryCache() },
    { provide: Database, useValue: createFakeDatabase() },
  ],
  exports: [EventBus, Cache, Database],
})
class InMemoryPlatformModule {}

describe("full flow with the real Nest modules and in-memory infrastructure", () => {
  let app: TestingModule;
  const delivered: AlertRaised[] = [];
  let failedAttempts = 0;

  const brokenChannel: Channel = {
    name: "broken",
    send: async () => {
      failedAttempts++;
      throw new Error("SMTP down");
    },
  };
  const fakeChannel: Channel = {
    name: "fake",
    send: async (alert) => {
      delivered.push(alert);
    },
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true }),
        InMemoryPlatformModule,
        IngestionModule,
        AnalysisModule,
        ForecastModule,
        NotificationModule,
      ],
    })
      .overrideProvider(CHANNELS)
      .useValue([brokenChannel, fakeChannel])
      .setLogger({ log: () => {}, warn: () => {}, error: () => {} })
      .compile();

    await app.init();
  });

  afterAll(() => app.close());

  it("a high power reading becomes an alert that reaches the resident, with the same correlationId", async () => {
    const ingestion = app.get(IngestionService);

    await ingestion.handleMessage("energy/home-01/meter-01/reading", devicePayload({ p: 5600 }));

    const [reading] = bus.eventsOf("readings");
    const [alert] = bus.eventsOf("alerts");
    const [forecast] = bus.eventsOf("forecasts");

    expect(alert.data.meterId).toBe("meter-01");
    expect(alert.correlationId).toBe(reading.correlationId);
    expect(forecast.correlationId).toBe(reading.correlationId);
    expect(failedAttempts).toBe(1);
    expect(delivered.map((a) => a.alertId)).toEqual([alert.data.alertId]);
  });
});
