import { Injectable } from "@nestjs/common";
import type { Redis } from "ioredis";
import { Cache } from "../ports";
import { RedisConnection } from "./redis-connection";

@Injectable()
export class RedisCache implements Cache {
  private readonly redis: Redis;

  constructor(connection: RedisConnection) {
    this.redis = connection.client;
  }

  get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) await this.redis.set(key, value, "EX", ttlSeconds);
    else await this.redis.set(key, value);
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, value, "EX", ttlSeconds, "NX");
    return result === "OK";
  }
}
