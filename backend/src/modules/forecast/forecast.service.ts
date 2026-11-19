import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  createEvent,
  type ForecastUpdated,
  type ForecastUpdatedEvent,
  type ReadingRecordedEvent,
} from "../../contracts/events";
import { EventBus } from "../../platform/ports";
import { forecastConfig, type ForecastConfig } from "./forecast.config";
import { ForecastRepository } from "./forecast.repository";
import { monthOf, movingAverage, projectMonth } from "./projection";

interface MeterState {
  averagePowerW?: number;
  lastPublishedAt: number;
  monthStart?: { month: string; energyKwh: number };
}

@Injectable()
export class ForecastService implements OnModuleInit {
  private readonly logger = new Logger(ForecastService.name);
  private readonly meters = new Map<string, MeterState>();

  constructor(
    private readonly bus: EventBus,
    private readonly repository: ForecastRepository,
    @Inject(forecastConfig.KEY) private readonly config: ForecastConfig,
  ) {}

  async onModuleInit() {
    await this.bus.subscribe("readings", "forecast", (event) => this.update(event).then(() => {}));
    this.logger.log(`forecasting monthly consumption (tariff R$ ${this.config.tariffPerKwh}/kWh)`);
  }

  async update(event: ReadingRecordedEvent): Promise<ForecastUpdated | null> {
    const reading = event.data;
    const now = new Date(reading.measuredAt);

    const state = this.meters.get(reading.meterId) ?? { lastPublishedAt: 0 };
    this.meters.set(reading.meterId, state);

    state.averagePowerW = movingAverage(state.averagePowerW, reading.powerW, this.config.averageAlpha);

    const tooSoon = now.getTime() - state.lastPublishedAt < this.config.publishIntervalSeconds * 1000;
    if (tooSoon) return null;

    const month = monthOf(now);
    if (state.monthStart?.month !== month) {
      const energyKwh = await this.repository.monthStartEnergy(reading.homeId, reading.meterId, month, reading.energyKwh);
      state.monthStart = { month, energyKwh };
    }

    const projection = projectMonth({
      monthStartEnergyKwh: state.monthStart.energyKwh,
      currentEnergyKwh: reading.energyKwh,
      averagePowerW: state.averagePowerW,
      now,
      tariffPerKwh: this.config.tariffPerKwh,
    });

    const forecast: ForecastUpdated = {
      homeId: reading.homeId,
      meterId: reading.meterId,
      ...projection,
      tariffPerKwh: this.config.tariffPerKwh,
      calculatedAt: new Date().toISOString(),
    };

    await this.repository.save(forecast);
    await this.bus.publish(
      "forecasts",
      createEvent<ForecastUpdatedEvent>("forecast.updated", forecast, "forecast", event.correlationId),
    );
    state.lastPublishedAt = now.getTime();

    this.logger.log(`${reading.meterId}: ${forecast.projectedKwh} kWh / R$ ${forecast.projectedCost} projected`);
    return forecast;
  }
}
