import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { MonitoringService } from "./monitoring.service";

@Controller("api")
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get("health")
  health() {
    return { status: "ok" };
  }

  @Get("meters")
  meters() {
    return this.monitoring.meters();
  }

  @Get("meters/:meterId/last-reading")
  async lastReading(@Param("meterId") meterId: string) {
    const reading = await this.monitoring.lastReading(meterId);
    if (!reading) throw new NotFoundException("no readings for this meter");
    return reading;
  }

  @Get("meters/:meterId/consumption")
  consumption(@Param("meterId") meterId: string, @Query("minutes") minutes?: string) {
    const window = Math.min(Math.max(Number(minutes) || 60, 1), 1440);
    return this.monitoring.consumption(meterId, window);
  }

  @Get("meters/:meterId/alerts")
  alerts(@Param("meterId") meterId: string) {
    return this.monitoring.alerts(meterId);
  }

  @Get("meters/:meterId/forecast")
  async forecast(@Param("meterId") meterId: string) {
    const forecast = await this.monitoring.forecast(meterId);
    if (!forecast) throw new NotFoundException("forecast not calculated yet");
    return forecast;
  }
}
