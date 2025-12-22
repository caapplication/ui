import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ApiCacheContext = createContext(null);

export const ApiCacheProvider = ({ children }) => {
  const [cache, setCache] = useState(new Map());
  const cacheTimestamps = useRef(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = (endpoint, params) => {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramString}`;
  };

  const get = useCallback((endpoint, params) => {
    const key = getCacheKey(endpoint, params);
    const cached = cache.get(key);
    const timestamp = cacheTimestamps.current.get(key);

    if (cached && timestamp) {
      const age = Date.now() - timestamp;
      if (age < CACHE_DURATION) {
        return cached;
      } else {
        // Expired, remove it
        cache.delete(key);
        cacheTimestamps.current.delete(key);
      }
    }
    return null;
  }, [cache]);

  const set = useCallback((endpoint, params, data) => {
    const key = getCacheKey(endpoint, params);
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, data);
      return newCache;
    });
    cacheTimestamps.current.set(key, Date.now());
  }, []);

  const invalidate = useCallback((endpoint, params = null) => {
    if (params) {
      const key = getCacheKey(endpoint, params);
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(key);
        return newCache;
      });
      cacheTimestamps.current.delete(key);
    } else {
      // Invalidate all entries for this endpoint
      setCache(prev => {
        const newCache = new Map(prev);
        for (const [key] of newCache) {
          if (key.startsWith(`${endpoint}:`)) {
            newCache.delete(key);
            cacheTimestamps.current.delete(key);
          }
        }
        return newCache;
      });
    }
  }, []);

  const clear = useCallback(() => {
    setCache(new Map());
    cacheTimestamps.current.clear();
  }, []);

  return (
    <ApiCacheContext.Provider value={{ get, set, invalidate, clear }}>
      {children}
    </ApiCacheContext.Provider>
  );
};

export const useApiCache = () => {
  const context = useContext(ApiCacheContext);
  if (!context) {
    throw new Error('useApiCache must be used within ApiCacheProvider');
  }
  return context;
};

