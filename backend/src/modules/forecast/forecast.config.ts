import { ConfigType, registerAs } from "@nestjs/config";

export const forecastConfig = registerAs("forecast", () => ({
  tariffPerKwh: Number(process.env.TARIFF_PER_KWH ?? 0.9),
  averageAlpha: Number(process.env.FORECAST_AVERAGE_ALPHA ?? 0.05),
  publishIntervalSeconds: Number(process.env.FORECAST_INTERVAL_SECONDS ?? 30),
}));

export type ForecastConfig = ConfigType<typeof forecastConfig>;
