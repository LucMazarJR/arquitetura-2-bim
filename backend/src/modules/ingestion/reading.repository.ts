import { Injectable } from "@nestjs/common";
import type { ReadingRecorded } from "../../contracts/events";
import { Database } from "../../platform/ports";

@Injectable()
export class ReadingRepository {
  constructor(private readonly db: Database) {}

  async save(r: ReadingRecorded): Promise<boolean> {
    const rows = await this.db.query(
      `INSERT INTO ingestion.readings
         (reading_id, home_id, meter_id, measured_at, voltage_v, current_a, power_w,
          energy_kwh, frequency_hz, power_factor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING
       RETURNING reading_id`,
      [r.readingId, r.homeId, r.meterId, r.measuredAt, r.voltageV, r.currentA, r.powerW,
        r.energyKwh, r.frequencyHz, r.powerFactor],
    );
    return rows.length > 0;
  }
}
