import type { ReadingValidated, Severity } from "../../contracts/events";
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

export class PowerAboveLimit implements Rule {
  readonly name = "power-above-limit";

  constructor(private readonly limitW: number) {}

  check(reading: ReadingValidated): Violation | null {
    if (reading.powerW <= this.limitW) return null;
    return {
      severity: "warning",
      message: `High consumption: ${Math.round(reading.powerW)} W (limit ${this.limitW} W)`,
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
      message: `Voltage too ${tooLow ? "low" : "high"}: ${voltage.toFixed(1)} V (expected ${this.minV}-${this.maxV} V)`,
      measuredValue: voltage,
      limit: tooLow ? this.minV : this.maxV,
    };
  }
}

export function defaultRules(config: AnalysisConfig): Rule[] {
  return [
    new PowerAboveLimit(config.powerLimitW),
    new VoltageOutOfRange(config.minVoltageV, config.maxVoltageV),
  ];
}
