import { Injectable } from "@nestjs/common";
import type { ForecastUpdated } from "../../contracts/events";
import { Database } from "../../platform/ports";

@Injectable()
export class ForecastRepository {
  constructor(private readonly db: Database) {}

  async monthStartEnergy(homeId: string, meterId: string, month: string, currentEnergyKwh: number): Promise<number> {
    const rows = await this.db.query<{ start_energy_kwh: number }>(
      `WITH inserted AS (
         INSERT INTO forecast.month_start (meter_id, month, home_id, start_energy_kwh)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING start_energy_kwh
       )
       SELECT start_energy_kwh FROM inserted
       UNION ALL
       SELECT start_energy_kwh FROM forecast.month_start WHERE meter_id = $1 AND month = $2
       LIMIT 1`,
      [meterId, month, homeId, currentEnergyKwh],
    );
    return rows[0]?.start_energy_kwh ?? currentEnergyKwh;
  }

  async save(f: ForecastUpdated): Promise<void> {
    await this.db.query(
      `INSERT INTO forecast.forecasts
         (home_id, meter_id, month, consumed_so_far_kwh, projected_kwh, projected_cost, tariff_per_kwh, calculated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [f.homeId, f.meterId, f.month, f.consumedSoFarKwh, f.projectedKwh, f.projectedCost, f.tariffPerKwh, f.calculatedAt],
    );
  }
}
