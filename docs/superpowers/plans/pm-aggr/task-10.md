# Task 10: Custom Server + Shared Singleton

**Files:**
- Create: `src/server/shared.ts`
- Create: `server.ts`

**Dependencies:** Tasks 6, 7 (connectors), 8 (BookManager), 9 (relay)

**Context:** Next.js doesn't natively support WebSocket servers, so we use a custom HTTP server that hands off HTTP requests to Next.js and upgrades WebSocket connections to our relay. The `shared.ts` module provides a singleton accessor so the API route handler (Task 11) can read the BookManager's merged book from the same process.

---

- [ ] **Step 1: Create `src/server/shared.ts`**

```typescript
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
```

- [ ] **Step 2: Create `server.ts`**

```typescript
import { createServer } from 'http';
import next from 'next';
import { BookManager } from '@/server/book-manager';
import { createRelay } from '@/server/ws-relay';
import { setBookManager } from '@/server/shared';
import { DFlowConnector } from '@/server/connectors/dflow';
import { PolymarketConnector } from '@/server/connectors/polymarket';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  const app = next({ dev });
  const handle = app.getRequestHandler();

  await app.prepare();

  // Create BookManager and expose it as singleton
  const bookManager = new BookManager();
  setBookManager(bookManager);

  // Create HTTP server
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Attach WebSocket relay to the HTTP server
  createRelay(server, bookManager);

  // Create and wire venue connectors
  const dflow = new DFlowConnector();
  const polymarket = new PolymarketConnector();

  dflow.onBookUpdate((book) => {
    bookManager.updateVenueBook('kalshi', book);
  });
  dflow.onStatusChange((status) => {
    bookManager.updateVenueStatus('kalshi', status);
  });

  polymarket.onBookUpdate((book) => {
    bookManager.updateVenueBook('polymarket', book);
  });
  polymarket.onStatusChange((status) => {
    bookManager.updateVenueStatus('polymarket', status);
  });

  // Connect to venues
  dflow.connect();
  polymarket.connect();

  // Start listening
  server.listen(port, () => {
    console.log(`> Server listening on http://localhost:${port}`);
    console.log(`> WebSocket relay on ws://localhost:${port}/ws`);
  });

  // Graceful shutdown
  function shutdown() {
    console.log('\nShutting down...');
    dflow.disconnect();
    polymarket.disconnect();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    // Force exit after 5s
    setTimeout(() => process.exit(1), 5000);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`

Expected: No errors. (May need `next build` first to generate `next-env.d.ts`.)

- [ ] **Step 4: Commit**

```bash
git add src/server/shared.ts server.ts
git commit -m "feat: add custom server with WS relay and venue connectors"
```
