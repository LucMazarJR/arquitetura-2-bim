import { ConfigType, registerAs } from "@nestjs/config";

export const analysisConfig = registerAs("analysis", () => ({
  powerLimitW: Number(process.env.POWER_LIMIT_W ?? 4500),
  minVoltageV: Number(process.env.MIN_VOLTAGE_V ?? 202),
  maxVoltageV: Number(process.env.MAX_VOLTAGE_V ?? 231),
  nightPowerLimitW: Number(process.env.NIGHT_POWER_LIMIT_W ?? 800),
  timeZone: process.env.TIME_ZONE ?? "America/Sao_Paulo",
  cooldownSeconds: Number(process.env.ALERT_COOLDOWN_SECONDS ?? 120),
}));

export type AnalysisConfig = ConfigType<typeof analysisConfig>;
