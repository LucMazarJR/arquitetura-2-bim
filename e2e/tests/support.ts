import { expect, type APIRequestContext } from "@playwright/test";
import mqtt from "mqtt";

export const API_TOKEN = process.env.API_TOKEN ?? "dev-token";
export const MQTT_URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

export const authHeaders = { Authorization: `Bearer ${API_TOKEN}` };

export interface DeviceReading {
  v: number;
  i: number;
  p: number;
  e: number;
  f: number;
  pf: number;
  ts: number;
}

export function deviceReading(overrides: Partial<DeviceReading> = {}): DeviceReading {
  return {
    v: 220.5,
    i: 2.1,
    p: 450,
    e: 1_300_000,
    f: 60,
    pf: 0.97,
    ts: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

export async function publishReadings(homeId: string, meterId: string, readings: DeviceReading[]) {
  const client = await mqtt.connectAsync(MQTT_URL, { clientId: `e2e-${meterId}` });
  for (const reading of readings) {
    await client.publishAsync(`energy/${homeId}/${meterId}/reading`, JSON.stringify(reading), { qos: 1 });
  }
  await client.endAsync();
}

export async function waitForMeter(request: APIRequestContext, meterId: string) {
  await expect
    .poll(
      async () => {
        const response = await request.get("/api/meters", { headers: authHeaders });
        const meters: { meterId: string }[] = await response.json();
        return meters.some((m) => m.meterId === meterId);
      },
      { timeout: 30_000 },
    )
    .toBe(true);
}

export function uniqueMeter(prefix: string) {
  const suffix = Date.now().toString(36);
  return { homeId: `home-${prefix}-${suffix}`, meterId: `meter-${prefix}-${suffix}` };
}
