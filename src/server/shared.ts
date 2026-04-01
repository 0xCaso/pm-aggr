import type { BookManager } from './book-manager';

let bookManagerInstance: BookManager | null = null;

export function setBookManager(bm: BookManager): void {
  bookManagerInstance = bm;
}

export function getBookManager(): BookManager {
  if (!bookManagerInstance) {
    throw new Error('BookManager not initialized — server.ts must call setBookManager() before API routes run');
  }
  return bookManagerInstance;
}
