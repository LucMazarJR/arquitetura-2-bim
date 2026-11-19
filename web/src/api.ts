export interface Reading {
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

export interface Alert {
  alertId: string;
  meterId?: string;
  rule: string;
  severity: "warning" | "critical";
  message: string;
  raisedAt: string;
}

export interface Forecast {
  homeId: string;
  meterId: string;
  month: string;
  consumedSoFarKwh: number;
  projectedKwh: number;
  projectedCost: number;
  tariffPerKwh: number;
  calculatedAt: string;
}

export interface Meter {
  meterId: string;
  homeId: string;
  lastSeen: string;
  lastReading: Reading | null;
}

export interface MinuteConsumption {
  minute: string;
  consumptionKwh: number;
  averagePowerW: number;
  maxPowerW: number;
}

export type LiveMessage =
  | { type: "reading"; data: Reading }
  | { type: "alert"; data: Alert & { meterId: string } }
  | { type: "forecast"; data: Forecast };

async function getJson<T>(path: string): Promise<T | null> {
  const response = await fetch(path);
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export const api = {
  meters: () => getJson<Meter[]>("/api/meters"),
  consumption: (meterId: string) => getJson<MinuteConsumption[]>(`/api/meters/${meterId}/consumption?minutes=60`),
  alerts: (meterId: string) => getJson<Alert[]>(`/api/meters/${meterId}/alerts`),
  forecast: (meterId: string) => getJson<Forecast>(`/api/meters/${meterId}/forecast`),
};
