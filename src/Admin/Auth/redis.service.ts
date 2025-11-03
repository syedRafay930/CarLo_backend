import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redisClient: Redis;

  constructor() {
    this.redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async setValue(key: string, value: any, ttl?: number): Promise<void> {
    await this.redisClient.set(key, JSON.stringify(value));
    if (ttl) await this.redisClient.expire(key, ttl);
  }

  async getValue(key: string): Promise<any | null> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteValue(key: string): Promise<void> {
    await this.redisClient.del(key);
  }
}