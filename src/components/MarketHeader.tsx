'use client';

import Image from 'next/image';
import type { NormalizedBook, Venue } from '@/lib/types';
import { MARKET } from '@/lib/types';

interface MarketHeaderProps {
  book: NormalizedBook | null;
}

function computeMid(book: NormalizedBook, venue: Venue): number | null {
  const bids = book.yes.bids.filter((l) => l.venue === venue);
  const asks = book.yes.asks.filter((l) => l.venue === venue);

  if (bids.length === 0 || asks.length === 0) return null;

  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;

  return (bestBid + bestAsk) / 2;
}

function formatCents(price: number): string {
  return `${(price * 100).toFixed(2)}¢`;
}

function VenueMid({ 
  venue, 
  mid, 
  logo 
}: { 
  venue: Venue; 
  mid: number | null; 
  logo: string;
}) {
  const brandColor = venue === 'kalshi' ? 'text-kalshi' : 'text-polymarket';
  const borderColor = venue === 'kalshi' ? 'border-kalshi' : 'border-polymarket';
  
  return (
    <div className="flex items-center gap-1.5">
      <div className={`relative w-4 h-4 rounded overflow-hidden border ${borderColor}`}>
        <Image
          src={logo}
          alt={`${venue} logo`}
          fill
          className="object-contain"
        />
      </div>
      <span className="text-gray-500 text-xs">mid</span>
      <span className={`${brandColor} text-xs`}>
        {mid !== null ? formatCents(mid) : '—'}
      </span>
    </div>
  );
}

export function MarketHeader({ book }: MarketHeaderProps) {
  const kalshiMid = book ? computeMid(book, 'kalshi') : null;
  const polyMid = book ? computeMid(book, 'polymarket') : null;

  return (
    <div className="px-3 py-2 border-b border-gray-800/50">
      <h1 className="font-display text-base font-semibold text-gray-100 leading-tight">
        {MARKET.title}
      </h1>
      <div className="flex gap-5 mt-1.5">
        <VenueMid venue="polymarket" mid={polyMid} logo="/logo-polymarket.png" />
        <VenueMid venue="kalshi" mid={kalshiMid} logo="/logo-kalshi.png" />
      </div>
    </div>
  );
}
