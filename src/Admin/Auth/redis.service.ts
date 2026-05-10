import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

/** Single shared Redis client for JWT blacklist, login cooldown, password-reset tokens. */
const REDIS_URL = () =>
  (process.env.REDIS_URL?.trim() || 'redis://localhost:6379').replace(
    /\/$/,
    '',
  );

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisClient: Redis;
  private loggedConnectionError = false;

  constructor() {
    const url = REDIS_URL();
    this.redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      retryStrategy: () => null,
      lazyConnect: false,
      showFriendlyErrorStack: false,
    });

    this.redisClient.on('error', (err) => {
      if (!this.loggedConnectionError) {
        this.loggedConnectionError = true;
        this.logger.warn(
          `Redis (${url.replace(/:[^:@/]+@/, ':****@')}): ${err.message} — ensure Redis is running (e.g. brew services start redis)`,
        );
      }
    });

    this.redisClient.on('connect', () => {
      this.loggedConnectionError = false;
      this.logger.log('Redis connected');
    });
  }

  async setValue(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.redisClient.set(key, JSON.stringify(value));
      if (ttl) await this.redisClient.expire(key, ttl);
    } catch {
      /* no-op when Redis unavailable */
    }
  }

  async getValue(key: string): Promise<any | null> {
    try {
      const value = await this.redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async deleteValue(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch {
      /* no-op */
    }
  }
}
