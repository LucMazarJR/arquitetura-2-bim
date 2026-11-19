import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Redis } from "ioredis";
import type { StreamName, Streams } from "../../contracts/events";
import { EventBus, EventHandler } from "../ports";
import { RedisConnection } from "./redis-connection";

type ReadResult = [stream: string, messages: [id: string, fields: string[] | null][]][] | null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class RedisEventBus implements EventBus, OnModuleDestroy {
  private readonly logger = new Logger("EventBus");
  private readonly redis: Redis;
  private readonly consumerName: string;
  private readers: Redis[] = [];
  private running = true;

  constructor(connection: RedisConnection, config: ConfigService) {
    this.redis = connection.client;
    this.consumerName = config.get<string>("CONSUMER_NAME", "c1");
  }

  async publish<S extends StreamName>(stream: S, event: Streams[S]): Promise<void> {
    await this.redis.xadd(stream, "MAXLEN", "~", 100_000, "*", "event", JSON.stringify(event));
  }

  async subscribe<S extends StreamName>(stream: S, group: string, handler: EventHandler<S>): Promise<void> {
    try {
      await this.redis.xgroup("CREATE", stream, group, "0", "MKSTREAM");
    } catch (error) {
      if (!String(error).includes("BUSYGROUP")) throw error;
    }
    const reader = this.redis.duplicate();
    this.readers.push(reader);
    void this.readLoop(reader, stream, group, handler);
  }

  private async readLoop<S extends StreamName>(reader: Redis, stream: S, group: string, handler: EventHandler<S>) {
    const consumer = `${group}-${this.consumerName}`;
    let lastId = "0";

    while (this.running) {
      try {
        const result = (await reader.call(
          "XREADGROUP", "GROUP", group, consumer, "COUNT", "50", "BLOCK", "5000", "STREAMS", stream, lastId,
        )) as ReadResult;
        const messages = result?.[0]?.[1] ?? [];

        if (lastId !== ">" && messages.length === 0) {
          lastId = ">";
          continue;
        }

        for (const [id, fields] of messages) {
          await this.handleMessage(stream, group, id, fields, handler);
          if (lastId !== ">") lastId = id;
        }
      } catch (error) {
        if (!this.running) return;
        this.logger.error(`failed to read stream ${stream} (${group}): ${error}`);
        await sleep(1000);
      }
    }
  }

  private async handleMessage<S extends StreamName>(
    stream: S, group: string, id: string, fields: string[] | null, handler: EventHandler<S>,
  ) {
    if (fields) {
      try {
        const json = fields[fields.indexOf("event") + 1];
        await handler(JSON.parse(json) as Streams[S]);
      } catch (error) {
        this.logger.error(`failed to handle ${stream}/${id} (${group}), it stays pending: ${error}`);
        return;
      }
    }
    await this.redis.xack(stream, group, id);
  }

  onModuleDestroy() {
    this.running = false;
    for (const reader of this.readers) reader.disconnect();
  }
}
