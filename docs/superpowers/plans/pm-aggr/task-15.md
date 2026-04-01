# Task 15: OrderBook Component

**Files:**
- Create: `src/components/OrderBook.tsx`

**Dependencies:** Task 12 (useOrderBook hook provides the data interface)

**Context:** Two-column order book display. Left column shows bids (green), right shows asks (red). Each row has: price, size, venue indicator (K=blue, P=purple). Horizontal size bars proportional to the max size in the visible set. Venue filter toggle with three buttons: "Combined" (default), "Kalshi", "Polymarket". Truncated to top 15 levels per side.

---

- [ ] **Step 1: Create `src/components/OrderBook.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { OrderBook as OrderBookType, PriceLevel, Side, Venue } from '@/lib/types';

type VenueFilter = 'combined' | Venue;

interface OrderBookProps {
  book: { yes: OrderBookType; no: OrderBookType } | null;
  side: Side;
}

const MAX_LEVELS = 15;

const VENUE_BADGE: Record<Venue, { letter: string; color: string }> = {
  kalshi: { letter: 'K', color: 'text-blue-400' },
  polymarket: { letter: 'P', color: 'text-purple-400' },
};

function filterByVenue(levels: PriceLevel[], filter: VenueFilter): PriceLevel[] {
  if (filter === 'combined') return levels;
  return levels.filter((l) => l.venue === filter);
}

function formatPrice(price: number): string {
  return (price * 100).toFixed(1);
}

function formatSize(size: number): string {
  if (size >= 1000) return `${(size / 1000).toFixed(1)}k`;
  return size.toFixed(0);
}

function LevelRow({
  level,
  maxSize,
  type,
}: {
  level: PriceLevel;
  maxSize: number;
  type: 'bid' | 'ask';
}) {
  const pct = maxSize > 0 ? (level.size / maxSize) * 100 : 0;
  const barColor = type === 'bid' ? 'bg-green-900/50' : 'bg-red-900/50';
  const textColor = type === 'bid' ? 'text-green-400' : 'text-red-400';
  const badge = VENUE_BADGE[level.venue];

  return (
    <div className="relative flex items-center gap-2 px-2 py-0.5 font-mono text-sm">
      <div
        className={`absolute inset-0 ${barColor}`}
        style={{
          width: `${pct}%`,
          [type === 'bid' ? 'right' : 'left']: 0,
          [type === 'bid' ? 'left' : 'right']: 'auto',
        }}
      />
      <span className={`relative z-10 w-12 text-right ${textColor}`}>
        {formatPrice(level.price)}
      </span>
      <span className="relative z-10 w-14 text-right text-gray-300">
        {formatSize(level.size)}
      </span>
      <span className={`relative z-10 w-4 text-center text-xs font-bold ${badge.color}`}>
        {badge.letter}
      </span>
    </div>
  );
}

export function OrderBook({ book, side }: OrderBookProps) {
  const [filter, setFilter] = useState<VenueFilter>('combined');

  const sideBook = book ? book[side] : null;
  const bids = sideBook ? filterByVenue(sideBook.bids, filter).slice(0, MAX_LEVELS) : [];
  const asks = sideBook ? filterByVenue(sideBook.asks, filter).slice(0, MAX_LEVELS) : [];

  const maxBidSize = bids.reduce((max, l) => Math.max(max, l.size), 0);
  const maxAskSize = asks.reduce((max, l) => Math.max(max, l.size), 0);
  const maxSize = Math.max(maxBidSize, maxAskSize);

  const filterOptions: { value: VenueFilter; label: string }[] = [
    { value: 'combined', label: 'Combined' },
    { value: 'kalshi', label: 'Kalshi' },
    { value: 'polymarket', label: 'Polymarket' },
  ];

  return (
    <div className="flex flex-col">
      {/* Venue filter toggle */}
      <div className="flex gap-1 px-2 pb-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
              filter === opt.value
                ? 'bg-gray-700 text-gray-100'
                : 'bg-gray-900 text-gray-500 hover:text-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-xs text-gray-500 font-medium px-2 pb-1">
          BIDS
        </div>
        <div className="text-xs text-gray-500 font-medium px-2 pb-1">
          ASKS
        </div>
      </div>

      {/* Order book rows */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          {bids.length === 0 ? (
            <div className="text-gray-600 text-sm px-2 py-4 text-center">
              No bids
            </div>
          ) : (
            bids.map((level, i) => (
              <LevelRow
                key={`${level.price}-${level.venue}-${i}`}
                level={level}
                maxSize={maxSize}
                type="bid"
              />
            ))
          )}
        </div>
        <div className="flex flex-col">
          {asks.length === 0 ? (
            <div className="text-gray-600 text-sm px-2 py-4 text-center">
              No asks
            </div>
          ) : (
            asks.map((level, i) => (
              <LevelRow
                key={`${level.price}-${level.venue}-${i}`}
                level={level}
                maxSize={maxSize}
                type="ask"
              />
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-2 pt-3 text-xs text-gray-500">
        <span>
          <span className="text-blue-400 font-bold">K</span> = Kalshi
        </span>
        <span>
          <span className="text-purple-400 font-bold">P</span> = Polymarket
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OrderBook.tsx
git commit -m "feat: add OrderBook component with venue filter, size bars, color coding"
```
