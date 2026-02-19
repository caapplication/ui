// Bridge file: re-exports everything from the modular api/ folder.
// Components that import from '@/lib/api.js' (with .js extension) will resolve here.
// FINANCE_API_BASE_URL is also exported here for components that need it directly.

export const FINANCE_API_BASE_URL = import.meta.env.VITE_FINANCE_API_URL || 'http://127.0.0.1:8003';

// Re-export everything from the modular api/ folder
export * from './api/index.js';