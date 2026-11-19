export interface ProjectionInput {
  monthStartEnergyKwh: number;
  currentEnergyKwh: number;
  averagePowerW: number;
  now: Date;
  tariffPerKwh: number;
}

export interface Projection {
  month: string;
  consumedSoFarKwh: number;
  projectedKwh: number;
  projectedCost: number;
}

const round = (value: number, decimals = 2) => Math.round(value * 10 ** decimals) / 10 ** decimals;

export function monthOf(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function hoursUntilEndOfMonth(now: Date): number {
  const endOfMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return (endOfMonth - now.getTime()) / 3_600_000;
}

export function movingAverage(previous: number | undefined, value: number, alpha: number): number {
  if (previous === undefined) return value;
  return previous + alpha * (value - previous);
}

export function projectMonth(input: ProjectionInput): Projection {
  const consumedSoFar = Math.max(0, input.currentEnergyKwh - input.monthStartEnergyKwh);
  const remaining = (input.averagePowerW / 1000) * hoursUntilEndOfMonth(input.now);
  const projected = consumedSoFar + remaining;

  return {
    month: monthOf(input.now),
    consumedSoFarKwh: round(consumedSoFar, 3),
    projectedKwh: round(projected, 1),
    projectedCost: round(projected * input.tariffPerKwh),
  };
}
