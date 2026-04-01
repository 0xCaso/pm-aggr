# Task 8: Book Manager (TDD)

**Files:**
- Create: `src/server/book-manager.ts`
- Create: `tests/server/book-manager.test.ts`

**Dependencies:** Tasks 2 (types), 4 (merge)

**Context:** The `BookManager` stores the latest normalized book from each venue, merges them into a combined `NormalizedBook`, and fires an `onChange` callback whenever the merged book changes. It also tracks per-venue connection status. The relay and the quote API route both read from this manager.

---

- [ ] **Step 1: Write the BookManager tests**

Create `tests/server/book-manager.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { BookManager } from '@/server/book-manager';

describe('BookManager', () => {
  it('starts with empty books', () => {
    const mgr = new BookManager();
    const merged = mgr.getMergedBook();

    expect(merged.yes.bids).toEqual([]);
    expect(merged.yes.asks).toEqual([]);
    expect(merged.no.bids).toEqual([]);
    expect(merged.no.asks).toEqual([]);
    expect(merged.venueStatus.kalshi).toBe('disconnected');
    expect(merged.venueStatus.polymarket).toBe('disconnected');
  });

  it('stores a venue book and returns it in merged output', () => {
    const mgr = new BookManager();
    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
        asks: [{ price: 0.38, size: 80, venue: 'kalshi' }],
      },
      no: {
        bids: [{ price: 0.62, size: 80, venue: 'kalshi' }],
        asks: [{ price: 0.63, size: 100, venue: 'kalshi' }],
      },
    });

    const merged = mgr.getMergedBook();
    expect(merged.yes.bids).toEqual([
      { price: 0.37, size: 100, venue: 'kalshi' },
    ]);
    expect(merged.yes.asks).toEqual([
      { price: 0.38, size: 80, venue: 'kalshi' },
    ]);
  });

  it('merges books from both venues sorted correctly', () => {
    const mgr = new BookManager();
    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
        asks: [{ price: 0.38, size: 80, venue: 'kalshi' }],
      },
      no: { bids: [], asks: [] },
    });
    mgr.updateVenueBook('polymarket', {
      yes: {
        bids: [{ price: 0.36, size: 200, venue: 'polymarket' }],
        asks: [{ price: 0.37, size: 150, venue: 'polymarket' }],
      },
      no: { bids: [], asks: [] },
    });

    const merged = mgr.getMergedBook();
    // Bids: 0.37K, 0.36P (descending)
    expect(merged.yes.bids.map((l) => l.price)).toEqual([0.37, 0.36]);
    expect(merged.yes.bids.map((l) => l.venue)).toEqual(['kalshi', 'polymarket']);
    // Asks: 0.37P, 0.38K (ascending)
    expect(merged.yes.asks.map((l) => l.price)).toEqual([0.37, 0.38]);
    expect(merged.yes.asks.map((l) => l.venue)).toEqual(['polymarket', 'kalshi']);
  });

  it('updates venue status', () => {
    const mgr = new BookManager();
    mgr.updateVenueStatus('kalshi', 'connected');
    mgr.updateVenueStatus('polymarket', 'reconnecting');

    const merged = mgr.getMergedBook();
    expect(merged.venueStatus.kalshi).toBe('connected');
    expect(merged.venueStatus.polymarket).toBe('reconnecting');
  });

  it('fires onChange when venue book is updated', () => {
    const mgr = new BookManager();
    const cb = vi.fn();
    mgr.onChange(cb);

    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
        asks: [],
      },
      no: { bids: [], asks: [] },
    });

    expect(cb).toHaveBeenCalledTimes(1);
    const arg = cb.mock.calls[0][0];
    expect(arg.yes.bids).toHaveLength(1);
  });

  it('fires onChange when venue status changes', () => {
    const mgr = new BookManager();
    const cb = vi.fn();
    mgr.onChange(cb);

    mgr.updateVenueStatus('polymarket', 'connected');

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('replaces previous venue book on update', () => {
    const mgr = new BookManager();

    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
        asks: [],
      },
      no: { bids: [], asks: [] },
    });

    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.38, size: 50, venue: 'kalshi' }],
        asks: [],
      },
      no: { bids: [], asks: [] },
    });

    const merged = mgr.getMergedBook();
    expect(merged.yes.bids).toEqual([
      { price: 0.38, size: 50, venue: 'kalshi' },
    ]);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run tests/server/book-manager.test.ts`

Expected: FAIL — `Cannot find module '@/server/book-manager'`

- [ ] **Step 3: Implement `BookManager`**

Create `src/server/book-manager.ts`:

```typescript
import { mergeBooks } from '@/lib/merge';
import type {
  ConnectionStatus,
  NormalizedBook,
  OrderBook,
  Venue,
} from '@/lib/types';

const EMPTY_BOOK: OrderBook = { bids: [], asks: [] };

export class BookManager {
  private venueBooks: Record<Venue, { yes: OrderBook; no: OrderBook }> = {
    kalshi: { yes: EMPTY_BOOK, no: EMPTY_BOOK },
    polymarket: { yes: EMPTY_BOOK, no: EMPTY_BOOK },
  };

  private venueStatus: Record<Venue, ConnectionStatus> = {
    kalshi: 'disconnected',
    polymarket: 'disconnected',
  };

  private changeCb: ((book: NormalizedBook) => void) | null = null;

  onChange(cb: (book: NormalizedBook) => void): void {
    this.changeCb = cb;
  }

  updateVenueBook(
    venue: Venue,
    book: { yes: OrderBook; no: OrderBook },
  ): void {
    this.venueBooks[venue] = book;
    this.notify();
  }

  updateVenueStatus(venue: Venue, status: ConnectionStatus): void {
    this.venueStatus[venue] = status;
    this.notify();
  }

  getMergedBook(): NormalizedBook {
    const k = this.venueBooks.kalshi;
    const p = this.venueBooks.polymarket;

    return {
      yes: mergeBooks(k.yes, p.yes),
      no: mergeBooks(k.no, p.no),
      venueStatus: { ...this.venueStatus },
      timestamp: Date.now(),
    };
  }

  private notify(): void {
    this.changeCb?.(this.getMergedBook());
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run tests/server/book-manager.test.ts`

Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/book-manager.ts tests/server/book-manager.test.ts
git commit -m "feat: add BookManager with venue storage, merging, and change notification"
```
