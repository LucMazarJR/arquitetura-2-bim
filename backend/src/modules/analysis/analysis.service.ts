import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { createEvent, type AlertRaised, type AlertRaisedEvent, type ReadingValidatedEvent } from "../../contracts/events";
import { Cache, EventBus } from "../../platform/ports";
import { AlertRepository } from "./alert.repository";
import { analysisConfig, type AnalysisConfig } from "./analysis.config";
import { RULES, type Rule } from "./rules";

@Injectable()
export class AnalysisService implements OnModuleInit {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly bus: EventBus,
    private readonly cache: Cache,
    private readonly repository: AlertRepository,
    @Inject(analysisConfig.KEY) private readonly config: AnalysisConfig,
    @Inject(RULES) private readonly rules: Rule[],
  ) {}

  async onModuleInit() {
    await this.bus.subscribe("readings", "analysis", (event) => this.analyze(event).then(() => {}));
    this.logger.log(`analyzing readings with rules: ${this.rules.map((r) => r.name).join(", ")}`);
  }

  async analyze(event: ReadingValidatedEvent): Promise<AlertRaised[]> {
    const reading = event.data;
    const alerts: AlertRaised[] = [];

    for (const rule of this.rules) {
      const violation = rule.check(reading);
      if (!violation) continue;

      const cooldownKey = `analysis:cooldown:${reading.meterId}:${rule.name}`;
      const isFirstInCooldown = await this.cache.setIfAbsent(cooldownKey, event.id, this.config.cooldownSeconds);
      if (!isFirstInCooldown) continue;

      const alert: AlertRaised = {
        alertId: randomUUID(),
        homeId: reading.homeId,
        meterId: reading.meterId,
        rule: rule.name,
        ...violation,
        raisedAt: new Date().toISOString(),
      };

      await this.repository.save(alert);
      await this.bus.publish("alerts", createEvent<AlertRaisedEvent>("alerta.gerado", alert, "analysis", event.correlationId));
      this.logger.log(`alert raised for ${reading.meterId}: ${alert.message}`);
      alerts.push(alert);
    }

    return alerts;
  }
}
