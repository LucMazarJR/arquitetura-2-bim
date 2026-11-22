import { Injectable } from "@nestjs/common";
import type { GoalUpdated } from "../../contracts/events";
import { Database } from "../../platform/ports";

@Injectable()
export class GoalRepository {
  constructor(private readonly db: Database) {}

  async save(goal: GoalUpdated): Promise<void> {
    await this.db.query(
      `INSERT INTO analysis.goals (meter_id, monthly_goal_kwh, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (meter_id) DO UPDATE
         SET monthly_goal_kwh = EXCLUDED.monthly_goal_kwh, updated_at = EXCLUDED.updated_at
       WHERE analysis.goals.updated_at <= EXCLUDED.updated_at`,
      [goal.meterId, goal.monthlyGoalKwh, goal.updatedAt],
    );
  }

  async find(meterId: string): Promise<number | null> {
    const rows = await this.db.query<{ monthly_goal_kwh: number }>(
      "SELECT monthly_goal_kwh FROM analysis.goals WHERE meter_id = $1",
      [meterId],
    );
    return rows[0]?.monthly_goal_kwh ?? null;
  }
}
