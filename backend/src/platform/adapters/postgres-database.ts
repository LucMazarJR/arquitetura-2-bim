import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { Database } from "../ports";

@Injectable()
export class PostgresDatabase implements Database, OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const url = config.get<string>("DATABASE_URL", "postgres://energy:energy@localhost:5433/energy");
    this.pool = new Pool({ connectionString: url, max: 10 });
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
