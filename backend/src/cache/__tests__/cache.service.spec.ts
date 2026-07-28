import { CacheService, CACHE_KEYS } from '../cache.service';

describe('CacheService', () => {
  it('should expose cache key helpers', () => {
    expect(CACHE_KEYS.categoriesAll).toBe('categories:all');
    expect(CACHE_KEYS.articlesList('page=1')).toBe('articles:list:page=1');
  });

  it('should disable cache when REDIS_HOST is not set', () => {
    const original = process.env.REDIS_HOST;
    delete process.env.REDIS_HOST;
    const service = new CacheService();
    expect(service.enabled).toBe(false);
    process.env.REDIS_HOST = original;
  });
});
