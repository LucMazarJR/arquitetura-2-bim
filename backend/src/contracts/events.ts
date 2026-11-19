import { randomUUID } from "node:crypto";

export interface Envelope<TType extends string, TData> {
  id: string;
  type: TType;
  version: number;
  occurredAt: string;
  correlationId: string;
  source: string;
  data: TData;
}

export interface ReadingRecorded {
  readingId: string;
  homeId: string;
  meterId: string;
  measuredAt: string;
  voltageV: number;
  currentA: number;
  powerW: number;
  energyKwh: number;
  frequencyHz: number;
  powerFactor: number;
}

export type Severity = "warning" | "critical";

export interface AlertRaised {
  alertId: string;
  homeId: string;
  meterId: string;
  rule: string;
  severity: Severity;
  message: string;
  measuredValue: number;
  limit: number;
  raisedAt: string;
}

export interface ForecastUpdated {
  homeId: string;
  meterId: string;
  month: string;
  consumedSoFarKwh: number;
  projectedKwh: number;
  projectedCost: number;
  tariffPerKwh: number;
  calculatedAt: string;
}

export type ReadingRecordedEvent = Envelope<"reading.recorded", ReadingRecorded>;
export type AlertRaisedEvent = Envelope<"alert.raised", AlertRaised>;
export type ForecastUpdatedEvent = Envelope<"forecast.updated", ForecastUpdated>;

export interface Streams {
  readings: ReadingRecordedEvent;
  alerts: AlertRaisedEvent;
  forecasts: ForecastUpdatedEvent;
}

export type StreamName = keyof Streams;

export function createEvent<E extends Envelope<string, unknown>>(
  type: E["type"],
  data: E["data"],
  source: string,
  correlationId?: string,
): E {
  const id = randomUUID();
  return {
    id,
    type,
    version: 1,
    occurredAt: new Date().toISOString(),
    correlationId: correlationId ?? id,
    source,
    data,
  } as E;
}
