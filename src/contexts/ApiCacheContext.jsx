import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ApiCacheContext = createContext(null);

export const ApiCacheProvider = ({ children }) => {
  const cache = useRef(new Map());
  const cacheTimestamps = useRef(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = (endpoint, params) => {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramString}`;
  };

  const get = useCallback((endpoint, params) => {
    const key = getCacheKey(endpoint, params);
    const cached = cache.current.get(key);
    const timestamp = cacheTimestamps.current.get(key);

    if (cached && timestamp) {
      const age = Date.now() - timestamp;
      if (age < CACHE_DURATION) {
        return cached;
      } else {
        // Expired, remove it
        cache.current.delete(key);
        cacheTimestamps.current.delete(key);
      }
    }
    return null;
  }, []);

  const set = useCallback((endpoint, params, data) => {
    const key = getCacheKey(endpoint, params);
    cache.current.set(key, data);
    cacheTimestamps.current.set(key, Date.now());
  }, []);

  const invalidate = useCallback((endpoint, params = null) => {
    if (params) {
      const key = getCacheKey(endpoint, params);
      cache.current.delete(key);
      cacheTimestamps.current.delete(key);
    } else {
      // Invalidate all entries for this endpoint
      for (const [key] of cache.current) {
        if (key.startsWith(`${endpoint}:`)) {
          cache.current.delete(key);
          cacheTimestamps.current.delete(key);
        }
      }
    }
  }, []);

  const clear = useCallback(() => {
    cache.current.clear();
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

