import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTokenGuard } from "./api-token.guard";
import { MonitoringService } from "./monitoring.service";

@Controller("api")
@UseGuards(ApiTokenGuard)
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

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

  @Get("meters/:meterId/goal")
  goal(@Param("meterId") meterId: string) {
    return this.monitoring.goal(meterId);
  }

  @Put("meters/:meterId/goal")
  setGoal(@Param("meterId") meterId: string, @Body() body: { monthlyGoalKwh?: unknown }) {
    const monthlyGoalKwh = Number(body?.monthlyGoalKwh);
    if (!Number.isFinite(monthlyGoalKwh) || monthlyGoalKwh <= 0) {
      throw new BadRequestException("monthlyGoalKwh must be a positive number");
    }
    return this.monitoring.setGoal(meterId, monthlyGoalKwh);
  }
}
