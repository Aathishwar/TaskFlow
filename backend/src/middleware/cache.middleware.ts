import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';

// Response cache configuration
const responseCache = new LRUCache<string, any>({
  max: 500, // Maximum number of cached responses
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

// Cache key generation
const generateCacheKey = (req: Request): string => {
  const userId = (req.user as any)?._id || 'anonymous';
  const method = req.method;
  const url = req.originalUrl;
  const query = JSON.stringify(req.query);
  return `${method}:${url}:${userId}:${query}`;
};

// Middleware to cache GET responses
export const cacheMiddleware = (ttl?: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const cachedResponse = responseCache.get(cacheKey);

    if (cachedResponse) {
      console.log(`🚀 Cache HIT for ${cacheKey}`);
      return res.json(cachedResponse);
    }

    // Store original res.json
    const originalJson = res.json;
    
    // Override res.json to cache the response
    res.json = function(body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`💾 Caching response for ${cacheKey}`);
        responseCache.set(cacheKey, body, { ttl: ttl || 1000 * 60 * 5 });
      }
      
      // Call original res.json
      return originalJson.call(this, body);
    };

    next();
  };
};

// Middleware to invalidate cache for specific patterns
export const invalidateCache = (patterns: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as any)?._id;
    
    patterns.forEach(pattern => {
      const keysToDelete: string[] = [];
      
      // Find keys that match the pattern
      for (const [key] of responseCache.entries()) {
        if (key.includes(pattern) && key.includes(userId)) {
          keysToDelete.push(key);
        }
      }
      
      // Delete matching keys
      keysToDelete.forEach(key => {
        responseCache.delete(key);
        console.log(`🗑️ Invalidated cache for ${key}`);
      });
    });

    next();
  };
};

// Clear all cache for a user
export const clearUserCache = (userId: string) => {
  const keysToDelete: string[] = [];
  
  for (const [key] of responseCache.entries()) {
    if (key.includes(userId)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    responseCache.delete(key);
  });
  
  console.log(`🗑️ Cleared ${keysToDelete.length} cache entries for user ${userId}`);
};

// Get cache stats
export const getCacheStats = () => {
  return {
    size: responseCache.size,
    max: responseCache.max,
    calculatedSize: responseCache.calculatedSize,
  };
};
