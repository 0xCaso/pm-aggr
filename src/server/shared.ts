import type { BookManager } from './book-manager';

// Use globalThis to share BookManager across module boundaries
// This is necessary because Next.js App Router API routes run in
// a separate module context from the custom server
const GLOBAL_KEY = Symbol.for('pm-aggr-book-manager');

export function setBookManager(bm: BookManager): void {
  (globalThis as unknown as Record<symbol, BookManager>)[GLOBAL_KEY] = bm;
}

export function getBookManager(): BookManager {
  const instance = (globalThis as unknown as Record<symbol, BookManager | undefined>)[GLOBAL_KEY];
  if (!instance) {
    throw new Error('BookManager not initialized — server.ts must call setBookManager() before API routes run');
  }
  return instance;
}
