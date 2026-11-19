import { Injectable, OnModuleInit } from "@nestjs/common";
import { Cache, EventBus } from "../../platform/ports";
import { LiveGateway } from "./live.gateway";
import { ReadModel } from "./read-model";

const lastReadingKey = (meterId: string) => `monitoring:last-reading:${meterId}`;
const forecastKey = (meterId: string) => `monitoring:forecast:${meterId}`;

@Injectable()
export class MonitoringService implements OnModuleInit {
  constructor(
    private readonly bus: EventBus,
    private readonly cache: Cache,
    private readonly readModel: ReadModel,
    private readonly live: LiveGateway,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe("readings", "monitoring", async ({ data }) => {
      await this.readModel.addReading(data);
      await this.cache.set(lastReadingKey(data.meterId), JSON.stringify(data));
      this.live.broadcast({ type: "reading", data });
    });

    await this.bus.subscribe("alerts", "monitoring", async ({ data }) => {
      await this.readModel.addAlert(data);
      this.live.broadcast({ type: "alert", data });
    });

    await this.bus.subscribe("forecasts", "monitoring", async ({ data }) => {
      await this.cache.set(forecastKey(data.meterId), JSON.stringify(data));
      this.live.broadcast({ type: "forecast", data });
    });
  }

  async meters() {
    const meters = await this.readModel.meters();
    return Promise.all(meters.map(async (m) => ({ ...m, lastReading: await this.lastReading(m.meterId) })));
  }

  lastReading(meterId: string) {
    return this.getJson(lastReadingKey(meterId));
  }

  forecast(meterId: string) {
    return this.getJson(forecastKey(meterId));
  }

  consumption(meterId: string, minutes: number) {
    return this.readModel.consumption(meterId, minutes);
  }

  alerts(meterId: string) {
    return this.readModel.alerts(meterId, 20);
  }

  private async getJson(key: string) {
    const value = await this.cache.get(key);
    return value ? JSON.parse(value) : null;
  }
}
