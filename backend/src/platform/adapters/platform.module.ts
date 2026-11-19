import { Global, Module } from "@nestjs/common";
import { Cache, Database, EventBus } from "../ports";
import { PostgresDatabase } from "./postgres-database";
import { RedisCache } from "./redis-cache";
import { RedisConnection } from "./redis-connection";
import { RedisEventBus } from "./redis-event-bus";

@Global()
@Module({
  providers: [
    RedisConnection,
    { provide: EventBus, useClass: RedisEventBus },
    { provide: Cache, useClass: RedisCache },
    { provide: Database, useClass: PostgresDatabase },
  ],
  exports: [EventBus, Cache, Database],
})
export class PlatformModule {}
