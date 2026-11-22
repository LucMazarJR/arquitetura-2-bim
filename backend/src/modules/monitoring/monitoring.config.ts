import { ConfigType, registerAs } from "@nestjs/config";

export const monitoringConfig = registerAs("monitoring", () => ({
  apiToken: process.env.API_TOKEN ?? "dev-token",
}));

export type MonitoringConfig = ConfigType<typeof monitoringConfig>;
