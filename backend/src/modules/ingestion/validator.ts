import type { DeviceReading } from "./translator";

const RANGES: Record<string, [min: number, max: number]> = {
  v: [0, 300],
  i: [0, 100],
  p: [0, 25_000],
  e: [0, Number.MAX_SAFE_INTEGER],
  f: [45, 65],
  pf: [0, 1],
};

const MAX_SECONDS_IN_FUTURE = 60;
const MAX_AGE_SECONDS = 24 * 3600;

export type ValidationResult =
  | { valid: true; reading: DeviceReading }
  | { valid: false; reason: string };

export function validateReading(input: unknown, now: Date): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { valid: false, reason: "payload is not a JSON object" };
  }
  const data = input as Record<string, unknown>;

  for (const [field, [min, max]] of Object.entries(RANGES)) {
    const value = data[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return { valid: false, reason: `field "${field}" is missing or not a number` };
    }
    if (value < min || value > max) {
      return { valid: false, reason: `field "${field}"=${value} is out of range [${min}, ${max}]` };
    }
  }

  if (typeof data.ts !== "number" || !Number.isInteger(data.ts)) {
    return { valid: false, reason: 'field "ts" is invalid' };
  }
  const secondsFromNow = data.ts - now.getTime() / 1000;
  if (secondsFromNow > MAX_SECONDS_IN_FUTURE) return { valid: false, reason: "reading is in the future" };
  if (-secondsFromNow > MAX_AGE_SECONDS) return { valid: false, reason: "reading is too old" };

  return { valid: true, reading: data as unknown as DeviceReading };
}
