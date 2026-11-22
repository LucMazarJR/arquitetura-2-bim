import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { RedisConnection } from "../src/platform/adapters/redis-connection";
import { RedisEventBus } from "../src/platform/adapters/redis-event-bus";
import { readingEvent } from "./support";

const REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379/15";

async function redisIsUp(): Promise<boolean> {
  const probe = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 0, retryStrategy: () => null });
  try {
    await probe.connect();
    await probe.ping();
    return true;
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
}

const waitFor = async (condition: () => boolean, timeoutMs = 5000) => {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeoutMs) await new Promise((r) => setTimeout(r, 50));
};

describe("RedisEventBus against a real Redis", () => {
  let available = false;
  let connection: RedisConnection;
  let bus: RedisEventBus;

  beforeAll(async () => {
    available = await redisIsUp();
    if (!available) return;
    const config = new ConfigService({ REDIS_URL, CONSUMER_NAME: `test-${Date.now()}` });
    connection = new RedisConnection(config);
    bus = new RedisEventBus(connection, config);
    await connection.client.del("readings");
  });

  afterAll(async () => {
    if (!available) return;
    await connection.client.del("readings");
    bus.onModuleDestroy();
    connection.onModuleDestroy();
  });

  it("delivers every published event to each consumer group", async () => {
    if (!available) {
      console.warn("Redis not available, skipping integration test");
      return;
    }
    const received: Record<string, string[]> = { first: [], second: [] };

    await bus.subscribe("readings", "first", async (event) => {
      received.first.push(event.data.readingId);
    });
    await bus.subscribe("readings", "second", async (event) => {
      received.second.push(event.data.readingId);
    });

    await bus.publish("readings", readingEvent({ readingId: "a" }));
    await bus.publish("readings", readingEvent({ readingId: "b" }));
    await waitFor(() => received.first.length === 2 && received.second.length === 2);

    expect(received.first).toEqual(["a", "b"]);
    expect(received.second).toEqual(["a", "b"]);
  });
});
