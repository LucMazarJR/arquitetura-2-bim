import type { ReadingRecorded } from "../../contracts/events";

export interface DeviceReading {
  v: number;
  i: number;
  p: number;
  e: number;
  f: number;
  pf: number;
  ts: number;
}

export interface ReadingOrigin {
  homeId: string;
  meterId: string;
}

const TOPIC_PATTERN = /^energy\/([^/]+)\/([^/]+)\/reading$/;

export function parseTopic(topic: string): ReadingOrigin | null {
  const match = TOPIC_PATTERN.exec(topic);
  return match ? { homeId: match[1], meterId: match[2] } : null;
}

export function translate(origin: ReadingOrigin, reading: DeviceReading): ReadingRecorded {
  return {
    readingId: `${origin.meterId}:${reading.ts}`,
    homeId: origin.homeId,
    meterId: origin.meterId,
    measuredAt: new Date(reading.ts * 1000).toISOString(),
    voltageV: reading.v,
    currentA: reading.i,
    powerW: reading.p,
    energyKwh: reading.e / 1000,
    frequencyHz: reading.f,
    powerFactor: reading.pf,
  };
}
