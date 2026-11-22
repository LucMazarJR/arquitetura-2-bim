import { Injectable } from "@nestjs/common";
import type { AlertRaised, ReadingValidated } from "../../contracts/events";
import { Database } from "../../platform/ports";

@Injectable()
export class ReadModel {
  constructor(private readonly db: Database) {}

  async addReading(r: ReadingValidated): Promise<void> {
    await this.db.query(
      `INSERT INTO monitoring.consumption_per_minute AS c
         (meter_id, home_id, minute, energy_min_kwh, energy_max_kwh, power_min_w, power_max_w)
       VALUES ($1, $2, date_trunc('minute', $3::timestamptz), $4, $4, $5, $5)
       ON CONFLICT (meter_id, minute) DO UPDATE SET
         energy_min_kwh = LEAST(c.energy_min_kwh, EXCLUDED.energy_min_kwh),
         energy_max_kwh = GREATEST(c.energy_max_kwh, EXCLUDED.energy_max_kwh),
         power_min_w    = LEAST(c.power_min_w, EXCLUDED.power_min_w),
         power_max_w    = GREATEST(c.power_max_w, EXCLUDED.power_max_w)`,
      [r.meterId, r.homeId, r.measuredAt, r.energyKwh, r.powerW],
    );
  }

  async addAlert(a: AlertRaised): Promise<void> {
    await this.db.query(
      `INSERT INTO monitoring.alerts (alert_id, home_id, meter_id, rule, severity, message, raised_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [a.alertId, a.homeId, a.meterId, a.rule, a.severity, a.message, a.raisedAt],
    );
  }

  consumption(meterId: string, minutes: number) {
    return this.db.query(
      `SELECT minute,
              kwh AS "consumptionKwh",
              round((kwh * 60000)::numeric)::float8 AS "averagePowerW",
              power_max_w AS "maxPowerW"
         FROM (
           SELECT minute, power_max_w,
                  GREATEST(energy_max_kwh - COALESCE(LAG(energy_max_kwh) OVER (ORDER BY minute), energy_min_kwh), 0) AS kwh
             FROM monitoring.consumption_per_minute
            WHERE meter_id = $1 AND minute >= now() - make_interval(mins => $2::int + 1)
         ) per_minute
        WHERE minute >= now() - make_interval(mins => $2::int)
        ORDER BY minute`,
      [meterId, minutes],
    );
  }

  alerts(meterId: string, limit: number) {
    return this.db.query(
      `SELECT alert_id AS "alertId", rule, severity, message, raised_at AS "raisedAt"
         FROM monitoring.alerts
        WHERE meter_id = $1
        ORDER BY raised_at DESC
        LIMIT $2`,
      [meterId, limit],
    );
  }

  meters() {
    return this.db.query<{ meterId: string; homeId: string; lastSeen: string }>(
      `SELECT DISTINCT ON (meter_id) meter_id AS "meterId", home_id AS "homeId", minute AS "lastSeen"
         FROM monitoring.consumption_per_minute
        ORDER BY meter_id, minute DESC`,
    );
  }
}
