# Task 3: Normalization Logic (TDD)

**Files:**
- Create: `src/lib/normalize.ts`
- Create: `tests/lib/normalize.test.ts`

**Dependencies:** Task 2 (types)

**Context:** DFlow returns `yes_bids` and `no_bids` as `{price_string: quantity_string}` maps. Polymarket returns `bids`/`asks` arrays with `{price, size}` for the YES token. Both need normalizing into `OrderBook` for yes and no sides.

---

- [ ] **Step 1: Write the DFlow normalization tests**

Create `tests/lib/normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeDFlow, normalizePolymarket } from '@/lib/normalize';

describe('normalizeDFlow', () => {
  it('converts yes_bids to YES bids and NO asks', () => {
    const result = normalizeDFlow({
      yes_bids: { '37': '100', '36': '200' },
      no_bids: {},
    });

    // YES bids: directly from yes_bids
    expect(result.yes.bids).toEqual([
      { price: 0.37, size: 100, venue: 'kalshi' },
      { price: 0.36, size: 200, venue: 'kalshi' },
    ]);
    expect(result.yes.asks).toEqual([]);

    // NO asks: 1-P for each yes_bid
    expect(result.no.asks).toEqual([
      { price: 0.63, size: 100, venue: 'kalshi' },
      { price: 0.64, size: 200, venue: 'kalshi' },
    ]);
    expect(result.no.bids).toEqual([]);
  });

  it('converts no_bids to NO bids and YES asks', () => {
    const result = normalizeDFlow({
      yes_bids: {},
      no_bids: { '60': '150', '62': '50' },
    });

    // NO bids: directly from no_bids
    expect(result.no.bids).toEqual([
      { price: 0.62, size: 50, venue: 'kalshi' },
      { price: 0.60, size: 150, venue: 'kalshi' },
    ]);
    expect(result.no.asks).toEqual([]);

    // YES asks: 1-P for each no_bid
    expect(result.yes.asks).toEqual([
      { price: 0.38, size: 50, venue: 'kalshi' },
      { price: 0.40, size: 150, venue: 'kalshi' },
    ]);
    expect(result.yes.bids).toEqual([]);
  });

  it('handles both sides populated', () => {
    const result = normalizeDFlow({
      yes_bids: { '37': '100' },
      no_bids: { '62': '80' },
    });

    // YES book
    expect(result.yes.bids).toEqual([
      { price: 0.37, size: 100, venue: 'kalshi' },
    ]);
    expect(result.yes.asks).toEqual([
      { price: 0.38, size: 80, venue: 'kalshi' },
    ]);

    // NO book
    expect(result.no.bids).toEqual([
      { price: 0.62, size: 80, venue: 'kalshi' },
    ]);
    expect(result.no.asks).toEqual([
      { price: 0.63, size: 100, venue: 'kalshi' },
    ]);
  });

  it('returns empty books for empty input', () => {
    const result = normalizeDFlow({ yes_bids: {}, no_bids: {} });
    expect(result.yes.bids).toEqual([]);
    expect(result.yes.asks).toEqual([]);
    expect(result.no.bids).toEqual([]);
    expect(result.no.asks).toEqual([]);
  });

  it('sorts bids descending and asks ascending', () => {
    const result = normalizeDFlow({
      yes_bids: { '34': '10', '37': '20', '35': '30' },
      no_bids: {},
    });
    expect(result.yes.bids.map((l) => l.price)).toEqual([0.37, 0.35, 0.34]);
    expect(result.no.asks.map((l) => l.price)).toEqual([0.63, 0.65, 0.66]);
  });
});
```

- [ ] **Step 2: Write the Polymarket normalization tests**

Append to the same test file:

```typescript
describe('normalizePolymarket', () => {
  it('maps YES token bids/asks directly to YES book', () => {
    const result = normalizePolymarket({
      bids: [
        { price: '0.36', size: '500' },
        { price: '0.35', size: '300' },
      ],
      asks: [
        { price: '0.37', size: '400' },
        { price: '0.38', size: '200' },
      ],
    });

    expect(result.yes.bids).toEqual([
      { price: 0.36, size: 500, venue: 'polymarket' },
      { price: 0.35, size: 300, venue: 'polymarket' },
    ]);
    expect(result.yes.asks).toEqual([
      { price: 0.37, size: 400, venue: 'polymarket' },
      { price: 0.38, size: 200, venue: 'polymarket' },
    ]);
  });

  it('derives NO book from YES token (bid→NO ask, ask→NO bid)', () => {
    const result = normalizePolymarket({
      bids: [{ price: '0.36', size: '500' }],
      asks: [{ price: '0.37', size: '400' }],
    });

    // YES bid at 0.36 → NO ask at 0.64
    expect(result.no.asks).toEqual([
      { price: 0.64, size: 500, venue: 'polymarket' },
    ]);
    // YES ask at 0.37 → NO bid at 0.63
    expect(result.no.bids).toEqual([
      { price: 0.63, size: 400, venue: 'polymarket' },
    ]);
  });

  it('sorts derived NO book correctly', () => {
    const result = normalizePolymarket({
      bids: [
        { price: '0.36', size: '500' },
        { price: '0.34', size: '100' },
      ],
      asks: [
        { price: '0.37', size: '400' },
        { price: '0.39', size: '200' },
      ],
    });

    // NO bids from YES asks: (1-0.37)=0.63, (1-0.39)=0.61 → sorted desc
    expect(result.no.bids.map((l) => l.price)).toEqual([0.63, 0.61]);
    // NO asks from YES bids: (1-0.36)=0.64, (1-0.34)=0.66 → sorted asc
    expect(result.no.asks.map((l) => l.price)).toEqual([0.64, 0.66]);
  });

  it('returns empty books for empty input', () => {
    const result = normalizePolymarket({ bids: [], asks: [] });
    expect(result.yes.bids).toEqual([]);
    expect(result.yes.asks).toEqual([]);
    expect(result.no.bids).toEqual([]);
    expect(result.no.asks).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

Run: `npx vitest run tests/lib/normalize.test.ts`

Expected: FAIL — `Cannot find module '@/lib/normalize'`

- [ ] **Step 4: Create `src/lib/normalize.ts` with stub exports**

```typescript
import type { OrderBook } from './types';

export interface DFlowRawBook {
  yes_bids: Record<string, string>;
  no_bids: Record<string, string>;
}

export interface PolymarketRawBook {
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
}

interface TwoSidedBook {
  yes: OrderBook;
  no: OrderBook;
}

export function normalizeDFlow(_raw: DFlowRawBook): TwoSidedBook {
  return {
    yes: { bids: [], asks: [] },
    no: { bids: [], asks: [] },
  };
}

export function normalizePolymarket(_raw: PolymarketRawBook): TwoSidedBook {
  return {
    yes: { bids: [], asks: [] },
    no: { bids: [], asks: [] },
  };
}
```

- [ ] **Step 5: Run tests — verify they fail with assertion errors (not import errors)**

Run: `npx vitest run tests/lib/normalize.test.ts`

Expected: FAIL — assertion errors like `expected [] to equal [{ price: 0.37, ... }]`

- [ ] **Step 6: Implement `normalizeDFlow`**

Replace the stub in `src/lib/normalize.ts`:

```typescript
export function normalizeDFlow(raw: DFlowRawBook): TwoSidedBook {
  const yesBids: PriceLevel[] = [];
  const noAsks: PriceLevel[] = [];

  for (const [priceStr, sizeStr] of Object.entries(raw.yes_bids)) {
    const price = Number(priceStr) / 100;
    const size = Number(sizeStr);
    yesBids.push({ price, size, venue: 'kalshi' });
    noAsks.push({ price: round(1 - price), size, venue: 'kalshi' });
  }

  const noBids: PriceLevel[] = [];
  const yesAsks: PriceLevel[] = [];

  for (const [priceStr, sizeStr] of Object.entries(raw.no_bids)) {
    const price = Number(priceStr) / 100;
    const size = Number(sizeStr);
    noBids.push({ price, size, venue: 'kalshi' });
    yesAsks.push({ price: round(1 - price), size, venue: 'kalshi' });
  }

  return {
    yes: {
      bids: yesBids.sort((a, b) => b.price - a.price),
      asks: yesAsks.sort((a, b) => a.price - b.price),
    },
    no: {
      bids: noBids.sort((a, b) => b.price - a.price),
      asks: noAsks.sort((a, b) => a.price - b.price),
    },
  };
}
```

Also add at the top of the file (after imports):

```typescript
import type { OrderBook, PriceLevel } from './types';

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
```

- [ ] **Step 7: Implement `normalizePolymarket`**

Replace the stub:

```typescript
export function normalizePolymarket(raw: PolymarketRawBook): TwoSidedBook {
  const yesBids: PriceLevel[] = raw.bids.map((l) => ({
    price: Number(l.price),
    size: Number(l.size),
    venue: 'polymarket' as const,
  }));
  const yesAsks: PriceLevel[] = raw.asks.map((l) => ({
    price: Number(l.price),
    size: Number(l.size),
    venue: 'polymarket' as const,
  }));

  // Derive NO book from YES token
  // YES bid at P → NO ask at 1-P
  const noAsks: PriceLevel[] = yesBids
    .map((l) => ({
      price: round(1 - l.price),
      size: l.size,
      venue: 'polymarket' as const,
    }))
    .sort((a, b) => a.price - b.price);

  // YES ask at P → NO bid at 1-P
  const noBids: PriceLevel[] = yesAsks
    .map((l) => ({
      price: round(1 - l.price),
      size: l.size,
      venue: 'polymarket' as const,
    }))
    .sort((a, b) => b.price - a.price);

  return {
    yes: {
      bids: yesBids.sort((a, b) => b.price - a.price),
      asks: yesAsks.sort((a, b) => a.price - b.price),
    },
    no: {
      bids: noBids,
      asks: noAsks,
    },
  };
}
```

- [ ] **Step 8: Run tests — verify they pass**

Run: `npx vitest run tests/lib/normalize.test.ts`

Expected: All 9 tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/normalize.ts tests/lib/normalize.test.ts
git commit -m "feat: add DFlow and Polymarket normalization with tests"
```
