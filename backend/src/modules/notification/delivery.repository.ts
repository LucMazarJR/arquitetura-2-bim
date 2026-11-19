import { Injectable } from "@nestjs/common";
import { Database } from "../../platform/ports";

@Injectable()
export class DeliveryRepository {
  constructor(private readonly db: Database) {}

  async wasDelivered(alertId: string, channel: string): Promise<boolean> {
    const rows = await this.db.query(
      "SELECT 1 FROM notification.deliveries WHERE alert_id = $1 AND channel = $2 AND success",
      [alertId, channel],
    );
    return rows.length > 0;
  }

  async record(alertId: string, channel: string, success: boolean, detail: string | null): Promise<void> {
    await this.db.query(
      `INSERT INTO notification.deliveries (alert_id, channel, success, detail, sent_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (alert_id, channel) DO UPDATE
         SET success = EXCLUDED.success, detail = EXCLUDED.detail, sent_at = EXCLUDED.sent_at`,
      [alertId, channel, success, detail],
    );
  }
}
