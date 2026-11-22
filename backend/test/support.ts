import {
  createEvent,
  type ForecastUpdated,
  type ForecastUpdatedEvent,
  type ReadingValidated,
  type ReadingValidatedEvent,
} from "../src/contracts/events";
import type { Database } from "../src/platform/ports";

export function createFakeDatabase(): Database {
  const savedReadings = new Set<string>();
  const goals = new Map<string, number>();

  return {
    async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      if (sql.includes("INSERT INTO ingestion.readings")) {
        const readingId = String(params[0]);
        if (savedReadings.has(readingId)) return [];
        savedReadings.add(readingId);
        return [{ reading_id: readingId } as T];
      }
      if (sql.includes("INSERT INTO analysis.goals")) {
        goals.set(String(params[0]), Number(params[1]));
        return [];
      }
      if (sql.includes("FROM analysis.goals")) {
        const goal = goals.get(String(params[0]));
        return goal === undefined ? [] : [{ monthly_goal_kwh: goal } as T];
      }
      return [];
    },
  };
}

export function forecastEvent(overrides: Partial<ForecastUpdated> = {}): ForecastUpdatedEvent {
  const forecast: ForecastUpdated = {
    homeId: "home-01",
    meterId: "meter-01",
    month: "2026-11",
    consumedSoFarKwh: 100,
    projectedKwh: 180,
    projectedCost: 162,
    tariffPerKwh: 0.9,
    calculatedAt: new Date().toISOString(),
    ...overrides,
  };
  return createEvent<ForecastUpdatedEvent>("previsao.atualizada", forecast, "test");
}

export function devicePayload(overrides: Record<string, unknown> = {}) {
  return {
    v: 220.4,
    i: 2.2,
    p: 480,
    e: 1_250_000,
    f: 60,
    pf: 0.98,
    ts: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

export function readingEvent(overrides: Partial<ReadingValidated> = {}): ReadingValidatedEvent {
  const reading: ReadingValidated = {
    readingId: "meter-01:1",
    homeId: "home-01",
    meterId: "meter-01",
    measuredAt: new Date().toISOString(),
    voltageV: 220,
    currentA: 2,
    powerW: 440,
    energyKwh: 1000,
    frequencyHz: 60,
    powerFactor: 0.98,
    ...overrides,
  };
  return createEvent<ReadingValidatedEvent>("leitura.validada", reading, "test");
}
