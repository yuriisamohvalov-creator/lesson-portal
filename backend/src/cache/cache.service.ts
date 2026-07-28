import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export const CACHE_KEYS = {
  categoriesAll: 'categories:all',
  articlesList: (query: string) => `articles:list:${query}`,
  coursesList: (query: string) => `courses:list:${query}`,
};

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;
  readonly enabled: boolean;

  constructor() {
    const host = process.env.REDIS_HOST;
    if (!host) {
      this.enabled = false;
      this.client = null;
      return;
    }

    this.client = new Redis({
      host,
      port: Number(process.env.REDIS_PORT || 6379),
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    this.enabled = true;

    this.client.connect().catch((err) => {
      this.logger.warn(`Redis unavailable, cache disabled: ${err.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // ignore cache write failures
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch {
      // ignore
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch {
      // ignore
    }
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
