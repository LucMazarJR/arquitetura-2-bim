import type { ForecastUpdated, ReadingValidated, Severity } from "../../contracts/events";
import type { AnalysisConfig } from "./analysis.config";

export const RULES = "ANALYSIS_RULES";

export interface Violation {
  severity: Severity;
  message: string;
  measuredValue: number;
  limit: number;
}

export interface Rule {
  readonly name: string;
  check(reading: ReadingValidated): Violation | null;
}

const formatNumber = (value: number, decimals = 0) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export class PowerAboveLimit implements Rule {
  readonly name = "power-above-limit";

  constructor(private readonly limitW: number) {}

  check(reading: ReadingValidated): Violation | null {
    if (reading.powerW <= this.limitW) return null;
    return {
      severity: "warning",
      message: `Consumo alto: ${formatNumber(reading.powerW)} W (limite de ${formatNumber(this.limitW)} W)`,
      measuredValue: reading.powerW,
      limit: this.limitW,
    };
  }
}

export class VoltageOutOfRange implements Rule {
  readonly name = "voltage-out-of-range";

  constructor(private readonly minV: number, private readonly maxV: number) {}

  check(reading: ReadingValidated): Violation | null {
    const voltage = reading.voltageV;
    if (voltage >= this.minV && voltage <= this.maxV) return null;
    const tooLow = voltage < this.minV;
    return {
      severity: "critical",
      message: `Tensão ${tooLow ? "baixa" : "alta"}: ${formatNumber(voltage, 1)} V (faixa adequada de ${this.minV} a ${this.maxV} V)`,
      measuredValue: voltage,
      limit: tooLow ? this.minV : this.maxV,
    };
  }
}

export class HighNightConsumption implements Rule {
  readonly name = "high-night-consumption";
  private readonly hourFormat: Intl.DateTimeFormat;

  constructor(private readonly limitW: number, timeZone: string) {
    this.hourFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone });
  }

  check(reading: ReadingValidated): Violation | null {
    const hour = Number(this.hourFormat.format(new Date(reading.measuredAt)));
    const isNight = hour < 5;
    if (!isNight || reading.powerW <= this.limitW) return null;
    return {
      severity: "warning",
      message: `Consumo anormal na madrugada: ${formatNumber(reading.powerW)} W às ${hour}h (limite de ${formatNumber(this.limitW)} W)`,
      measuredValue: reading.powerW,
      limit: this.limitW,
    };
  }
}

export type GoalViolation = Violation & { rule: string };

export function checkMonthlyGoal(forecast: ForecastUpdated, goalKwh: number): GoalViolation | null {
  if (forecast.consumedSoFarKwh > goalKwh) {
    return {
      rule: "monthly-goal-exceeded",
      severity: "critical",
      message: `Meta mensal excedida: ${formatNumber(forecast.consumedSoFarKwh, 1)} kWh consumidos (meta de ${formatNumber(goalKwh)} kWh)`,
      measuredValue: forecast.consumedSoFarKwh,
      limit: goalKwh,
    };
  }
  if (forecast.projectedKwh > goalKwh) {
    return {
      rule: "monthly-goal-at-risk",
      severity: "warning",
      message: `Meta em risco: no ritmo atual, o mês fecha em ${formatNumber(forecast.projectedKwh, 1)} kWh (meta de ${formatNumber(goalKwh)} kWh)`,
      measuredValue: forecast.projectedKwh,
      limit: goalKwh,
    };
  }
  return null;
}

export function defaultRules(config: AnalysisConfig): Rule[] {
  return [
    new PowerAboveLimit(config.powerLimitW),
    new VoltageOutOfRange(config.minVoltageV, config.maxVoltageV),
    new HighNightConsumption(config.nightPowerLimitW, config.timeZone),
  ];
}
