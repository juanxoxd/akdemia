export interface RedisRepositoryPort {
  set(key: string, value: string, ttl?: number): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  scanKeys(pattern: string): Promise<string[]>;
}

export const RedisRepository = Symbol('RedisRepository');
