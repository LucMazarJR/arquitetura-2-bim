import type { Cache } from "../ports";

export class MemoryCache implements Cache {
  private items = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private now: () => number = Date.now) {}

  async get(key: string): Promise<string | null> {
    const item = this.items.get(key);
    if (!item) return null;
    if (item.expiresAt !== undefined && item.expiresAt <= this.now()) {
      this.items.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? this.now() + ttlSeconds * 1000 : undefined;
    this.items.set(key, { value, expiresAt });
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if ((await this.get(key)) !== null) return false;
    await this.set(key, value, ttlSeconds);
    return true;
  }
}
