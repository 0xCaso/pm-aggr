'use client';

import type { NormalizedBook, Venue } from '@/lib/types';
import { MARKET } from '@/lib/types';

interface MarketHeaderProps {
  book: NormalizedBook | null;
}

function computeMid(book: NormalizedBook, venue: Venue): number | null {
  const bids = book.yes.bids.filter((l) => l.venue === venue);
  const asks = book.yes.asks.filter((l) => l.venue === venue);

  if (bids.length === 0 || asks.length === 0) return null;

  const bestBid = bids[0].price; // bids sorted descending
  const bestAsk = asks[0].price; // asks sorted ascending

  return (bestBid + bestAsk) / 2;
}

function formatCents(price: number): string {
  return `${(price * 100).toFixed(2)}¢`;
}

export function MarketHeader({ book }: MarketHeaderProps) {
  const kalshiMid = book ? computeMid(book, 'kalshi') : null;
  const polyMid = book ? computeMid(book, 'polymarket') : null;

  return (
    <div className="px-4 py-4 border-b border-gray-800">
      <h1 className="text-xl font-bold text-gray-100">
        {MARKET.title}
      </h1>
      <div className="flex gap-6 mt-2 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-400">Kalshi mid:</span>
          <span className="text-gray-200 font-mono">
            {kalshiMid !== null ? formatCents(kalshiMid) : '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-gray-400">Polymarket mid:</span>
          <span className="text-gray-200 font-mono">
            {polyMid !== null ? formatCents(polyMid) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
