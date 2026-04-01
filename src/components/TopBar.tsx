'use client';

import Image from 'next/image';
import type { ConnectionStatus, NormalizedBook, Venue } from '@/lib/types';
import { MARKET } from '@/lib/types';

interface TopBarProps {
  book: NormalizedBook | null;
  relayStatus: ConnectionStatus;
  isStale: boolean;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: 'bg-bid',
  reconnecting: 'bg-yellow-500',
  disconnected: 'bg-ask',
};

function computeMid(book: NormalizedBook, venue: Venue): number | null {
  const bids = book.yes.bids.filter((l) => l.venue === venue);
  const asks = book.yes.asks.filter((l) => l.venue === venue);

  if (bids.length === 0 || asks.length === 0) return null;

  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;

  return (bestBid + bestAsk) / 2;
}

function formatCents(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

function VenueMidPill({ 
  venue, 
  mid, 
  logo,
  status,
  hasData,
}: { 
  venue: Venue; 
  mid: number | null; 
  logo: string;
  status: ConnectionStatus;
  hasData: boolean;
}) {
  const brandColor = venue === 'kalshi' ? 'text-kalshi' : 'text-polymarket';
  
  // Determine what to show based on connection status and data availability
  const showLoading = status === 'connected' && !hasData;
  const showDisconnected = status !== 'connected';
  
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded border border-gray-800">
      <div className="relative w-4 h-4 rounded overflow-hidden">
        <Image
          src={logo}
          alt={`${venue} logo`}
          fill
          className="object-contain"
        />
      </div>
      <span className={`${brandColor} text-sm font-mono tabular-nums`}>
        {showDisconnected ? (
          <span className="text-gray-500 text-xs">offline</span>
        ) : showLoading ? (
          <span className="text-gray-500 text-xs">loading...</span>
        ) : mid !== null ? (
          formatCents(mid)
        ) : (
          '—'
        )}
      </span>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status]}`} />
    </div>
  );
}

export function TopBar({ book, relayStatus, isStale }: TopBarProps) {
  const kalshiMid = book ? computeMid(book, 'kalshi') : null;
  const polyMid = book ? computeMid(book, 'polymarket') : null;
  
  const venueStatus = book?.venueStatus;
  
  // Check if we have actual data from each venue (not just connected)
  const hasPolymarketData = book ? (
    book.yes.bids.some(l => l.venue === 'polymarket') ||
    book.yes.asks.some(l => l.venue === 'polymarket')
  ) : false;
  
  const hasKalshiData = book ? (
    book.yes.bids.some(l => l.venue === 'kalshi') ||
    book.yes.asks.some(l => l.venue === 'kalshi')
  ) : false;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/50">
      {/* Left: Market title */}
      <div className="flex items-center gap-3">
        <h1 className="font-display text-lg font-semibold text-gray-100 leading-tight">
          {MARKET.title}
        </h1>
        
        {/* Relay status indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[relayStatus]}`} />
          <span>relay</span>
        </div>
        
        {isStale && (
          <span className="text-yellow-500 text-xs px-2 py-0.5 bg-yellow-500/10 rounded">
            stale
          </span>
        )}
      </div>

      {/* Right: Venue mid prices with status */}
      <div className="flex items-center gap-2">
        <VenueMidPill 
          venue="polymarket" 
          mid={polyMid} 
          logo="/logo-polymarket.png"
          status={venueStatus?.polymarket ?? 'disconnected'}
          hasData={hasPolymarketData}
        />
        <VenueMidPill 
          venue="kalshi" 
          mid={kalshiMid} 
          logo="/logo-kalshi.png"
          status={venueStatus?.kalshi ?? 'disconnected'}
          hasData={hasKalshiData}
        />
      </div>
    </div>
  );
}
