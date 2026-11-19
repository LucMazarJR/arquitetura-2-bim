import type { StreamName, Streams } from "../../contracts/events";
import type { EventBus, EventHandler } from "../ports";

type AnyHandler = (event: never) => Promise<void>;

export class MemoryEventBus implements EventBus {
  published: { stream: StreamName; event: Streams[StreamName] }[] = [];
  private handlers = new Map<StreamName, AnyHandler[]>();

  async publish<S extends StreamName>(stream: S, event: Streams[S]): Promise<void> {
    this.published.push({ stream, event });
    for (const handler of this.handlers.get(stream) ?? []) {
      await handler(event as never);
    }
  }

  async subscribe<S extends StreamName>(stream: S, _group: string, handler: EventHandler<S>): Promise<void> {
    const list = this.handlers.get(stream) ?? [];
    list.push(handler as AnyHandler);
    this.handlers.set(stream, list);
  }

  eventsOf<S extends StreamName>(stream: S): Streams[S][] {
    return this.published.filter((p) => p.stream === stream).map((p) => p.event as Streams[S]);
  }
}
