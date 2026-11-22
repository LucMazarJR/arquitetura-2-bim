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

export interface Goal {
  meterId: string;
  monthlyGoalKwh: number;
  updatedAt: string;
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

const API_TOKEN: string = import.meta.env.VITE_API_TOKEN ?? "dev-token";

export function liveFeedUrl(): string {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${location.host}/ws?token=${encodeURIComponent(API_TOKEN)}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const response = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${API_TOKEN}`, "Content-Type": "application/json" },
  });
  if (!response.ok) return null;
  return response.json() as Promise<T>;
}

export const api = {
  meters: () => request<Meter[]>("/api/meters"),
  consumption: (meterId: string) => request<MinuteConsumption[]>(`/api/meters/${meterId}/consumption?minutes=60`),
  alerts: (meterId: string) => request<Alert[]>(`/api/meters/${meterId}/alerts`),
  forecast: (meterId: string) => request<Forecast>(`/api/meters/${meterId}/forecast`),
  goal: (meterId: string) => request<Goal>(`/api/meters/${meterId}/goal`),
  setGoal: (meterId: string, monthlyGoalKwh: number) =>
    request<Goal>(`/api/meters/${meterId}/goal`, { method: "PUT", body: JSON.stringify({ monthlyGoalKwh }) }),
};
