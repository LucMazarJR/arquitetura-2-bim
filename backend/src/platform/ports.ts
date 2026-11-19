import type { StreamName, Streams } from "../contracts/events";

export type EventHandler<S extends StreamName> = (event: Streams[S]) => Promise<void>;

export abstract class EventBus {
  abstract publish<S extends StreamName>(stream: S, event: Streams[S]): Promise<void>;
  abstract subscribe<S extends StreamName>(stream: S, group: string, handler: EventHandler<S>): Promise<void>;
}

export abstract class Cache {
  abstract get(key: string): Promise<string | null>;
  abstract set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  abstract setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
}

export abstract class Database {
  abstract query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}
