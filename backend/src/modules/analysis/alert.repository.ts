import { Injectable } from "@nestjs/common";
import type { AlertRaised } from "../../contracts/events";
import { Database } from "../../platform/ports";

@Injectable()
export class AlertRepository {
  constructor(private readonly db: Database) {}

  async save(a: AlertRaised): Promise<void> {
    await this.db.query(
      `INSERT INTO analysis.alerts
         (alert_id, home_id, meter_id, rule, severity, message, measured_value, limit_value, raised_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [a.alertId, a.homeId, a.meterId, a.rule, a.severity, a.message, a.measuredValue, a.limit, a.raisedAt],
    );
  }
}
