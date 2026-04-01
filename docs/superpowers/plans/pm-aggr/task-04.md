# Task 4: Merge Logic (TDD)

**Files:**
- Create: `src/lib/merge.ts`
- Create: `tests/lib/merge.test.ts`

**Dependencies:** Task 2 (types)

**Context:** The merge function takes two `OrderBook` objects (one per venue) and combines them into a single `OrderBook` with levels from both venues, sorted correctly. Levels at the same price from different venues remain as separate entries (preserving venue attribution).

---

- [ ] **Step 1: Write the merge tests**

Create `tests/lib/merge.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mergeBooks } from '@/lib/merge';
import type { OrderBook } from '@/lib/types';

describe('mergeBooks', () => {
  it('merges bids in descending order across venues', () => {
    const a: OrderBook = {
      bids: [
        { price: 0.37, size: 100, venue: 'kalshi' },
        { price: 0.35, size: 200, venue: 'kalshi' },
      ],
      asks: [],
    };
    const b: OrderBook = {
      bids: [
        { price: 0.36, size: 300, venue: 'polymarket' },
        { price: 0.34, size: 400, venue: 'polymarket' },
      ],
      asks: [],
    };

    const result = mergeBooks(a, b);
    expect(result.bids).toEqual([
      { price: 0.37, size: 100, venue: 'kalshi' },
      { price: 0.36, size: 300, venue: 'polymarket' },
      { price: 0.35, size: 200, venue: 'kalshi' },
      { price: 0.34, size: 400, venue: 'polymarket' },
    ]);
  });

  it('merges asks in ascending order across venues', () => {
    const a: OrderBook = {
      bids: [],
      asks: [
        { price: 0.38, size: 100, venue: 'kalshi' },
        { price: 0.40, size: 200, venue: 'kalshi' },
      ],
    };
    const b: OrderBook = {
      bids: [],
      asks: [
        { price: 0.37, size: 300, venue: 'polymarket' },
        { price: 0.39, size: 400, venue: 'polymarket' },
      ],
    };

    const result = mergeBooks(a, b);
    expect(result.asks).toEqual([
      { price: 0.37, size: 300, venue: 'polymarket' },
      { price: 0.38, size: 100, venue: 'kalshi' },
      { price: 0.39, size: 400, venue: 'polymarket' },
      { price: 0.40, size: 200, venue: 'kalshi' },
    ]);
  });

  it('preserves separate entries at same price from different venues', () => {
    const a: OrderBook = {
      bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
      asks: [],
    };
    const b: OrderBook = {
      bids: [{ price: 0.37, size: 200, venue: 'polymarket' }],
      asks: [],
    };

    const result = mergeBooks(a, b);
    expect(result.bids).toHaveLength(2);
    expect(result.bids[0]).toEqual({ price: 0.37, size: 100, venue: 'kalshi' });
    expect(result.bids[1]).toEqual({ price: 0.37, size: 200, venue: 'polymarket' });
  });

  it('handles one empty book', () => {
    const a: OrderBook = {
      bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
      asks: [{ price: 0.38, size: 50, venue: 'kalshi' }],
    };
    const empty: OrderBook = { bids: [], asks: [] };

    const result = mergeBooks(a, empty);
    expect(result.bids).toEqual(a.bids);
    expect(result.asks).toEqual(a.asks);
  });

  it('handles both empty books', () => {
    const empty: OrderBook = { bids: [], asks: [] };
    const result = mergeBooks(empty, empty);
    expect(result.bids).toEqual([]);
    expect(result.asks).toEqual([]);
  });

  it('merges full books with interleaved prices', () => {
    const kalshi: OrderBook = {
      bids: [
        { price: 0.37, size: 100, venue: 'kalshi' },
        { price: 0.35, size: 150, venue: 'kalshi' },
      ],
      asks: [
        { price: 0.38, size: 80, venue: 'kalshi' },
        { price: 0.40, size: 120, venue: 'kalshi' },
      ],
    };
    const poly: OrderBook = {
      bids: [
        { price: 0.36, size: 200, venue: 'polymarket' },
        { price: 0.34, size: 250, venue: 'polymarket' },
      ],
      asks: [
        { price: 0.37, size: 300, venue: 'polymarket' },
        { price: 0.39, size: 180, venue: 'polymarket' },
      ],
    };

    const result = mergeBooks(kalshi, poly);

    // Bids: 0.37K, 0.36P, 0.35K, 0.34P
    expect(result.bids.map((l) => l.price)).toEqual([0.37, 0.36, 0.35, 0.34]);
    // Asks: 0.37P, 0.38K, 0.39P, 0.40K
    expect(result.asks.map((l) => l.price)).toEqual([0.37, 0.38, 0.39, 0.40]);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run tests/lib/merge.test.ts`

Expected: FAIL — `Cannot find module '@/lib/merge'`

- [ ] **Step 3: Implement `mergeBooks`**

Create `src/lib/merge.ts`:

```typescript
import type { OrderBook, PriceLevel } from './types';

function mergeSorted(
  a: PriceLevel[],
  b: PriceLevel[],
  comparator: (x: PriceLevel, y: PriceLevel) => number,
): PriceLevel[] {
  const result: PriceLevel[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (comparator(a[i], b[j]) <= 0) {
      result.push(a[i]);
      i++;
    } else {
      result.push(b[j]);
      j++;
    }
  }

  while (i < a.length) {
    result.push(a[i]);
    i++;
  }
  while (j < b.length) {
    result.push(b[j]);
    j++;
  }

  return result;
}

export function mergeBooks(a: OrderBook, b: OrderBook): OrderBook {
  return {
    // Bids: descending by price (higher first)
    bids: mergeSorted(a.bids, b.bids, (x, y) => y.price - x.price),
    // Asks: ascending by price (lower first)
    asks: mergeSorted(a.asks, b.asks, (x, y) => x.price - y.price),
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run tests/lib/merge.test.ts`

Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/merge.ts tests/lib/merge.test.ts
git commit -m "feat: add order book merge logic with tests"
```
