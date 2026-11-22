import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  createEvent,
  type AlertRaised,
  type AlertRaisedEvent,
  type ForecastUpdatedEvent,
  type ReadingValidatedEvent,
} from "../../contracts/events";
import { Cache, EventBus } from "../../platform/ports";
import { AlertRepository } from "./alert.repository";
import { analysisConfig, type AnalysisConfig } from "./analysis.config";
import { GoalRepository } from "./goal.repository";
import { checkMonthlyGoal, RULES, type Rule, type Violation } from "./rules";

interface AlertTarget {
  homeId: string;
  meterId: string;
}

interface SourceEvent {
  id: string;
  correlationId: string;
}

@Injectable()
export class AnalysisService implements OnModuleInit {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly bus: EventBus,
    private readonly cache: Cache,
    private readonly alerts: AlertRepository,
    private readonly goals: GoalRepository,
    @Inject(analysisConfig.KEY) private readonly config: AnalysisConfig,
    @Inject(RULES) private readonly rules: Rule[],
  ) {}

  async onModuleInit() {
    await this.bus.subscribe("readings", "analysis", (event) => this.analyze(event).then(() => {}));
    await this.bus.subscribe("forecasts", "analysis", (event) => this.checkGoal(event).then(() => {}));
    await this.bus.subscribe("goals", "analysis", (event) => this.goals.save(event.data));
    this.logger.log(`analyzing readings with rules: ${this.rules.map((r) => r.name).join(", ")}, monthly-goal`);
  }

  async analyze(event: ReadingValidatedEvent): Promise<AlertRaised[]> {
    const raised: AlertRaised[] = [];

    for (const rule of this.rules) {
      const violation = rule.check(event.data);
      if (!violation) continue;

      const alert = await this.raise(rule.name, violation, event.data, event);
      if (alert) raised.push(alert);
    }

    return raised;
  }

  async checkGoal(event: ForecastUpdatedEvent): Promise<AlertRaised | null> {
    const goalKwh = await this.goals.find(event.data.meterId);
    if (goalKwh === null) return null;

    const violation = checkMonthlyGoal(event.data, goalKwh);
    if (!violation) return null;

    return this.raise(violation.rule, violation, event.data, event);
  }

  private async raise(rule: string, violation: Violation, target: AlertTarget, source: SourceEvent) {
    const cooldownKey = `analysis:cooldown:${target.meterId}:${rule}`;
    const isFirstInCooldown = await this.cache.setIfAbsent(cooldownKey, source.id, this.config.cooldownSeconds);
    if (!isFirstInCooldown) return null;

    const alert: AlertRaised = {
      alertId: randomUUID(),
      homeId: target.homeId,
      meterId: target.meterId,
      rule,
      severity: violation.severity,
      message: violation.message,
      measuredValue: violation.measuredValue,
      limit: violation.limit,
      raisedAt: new Date().toISOString(),
    };

    await this.alerts.save(alert);
    await this.bus.publish("alerts", createEvent<AlertRaisedEvent>("alerta.gerado", alert, "analysis", source.correlationId));
    this.logger.log(`alert raised for ${target.meterId}: ${alert.message}`);
    return alert;
  }
}
