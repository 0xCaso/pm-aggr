'use client';

import Image from 'next/image';
import type { ConnectionStatus, NormalizedBook, Venue } from '@/lib/types';
import { MARKET } from '@/lib/types';

interface TopBarProps {
  book: NormalizedBook | null;
  isStale: boolean;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: 'bg-bid',
  reconnecting: 'bg-yellow-500',
  disconnected: 'bg-ask',
};

const VENUE_LINKS: Record<Venue, string> = {
  polymarket: 'https://polymarket.com/event/republican-presidential-nominee-2028',
  kalshi: 'https://kalshi.com/markets/kxpresnomr/republican-primary-winner/kxpresnomr-28',
};

// External link icon (Heroicons - arrow-top-right-on-square)
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 20 20" 
      fill="currentColor" 
      className={className}
    >
      <path 
        fillRule="evenodd" 
        d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" 
        clipRule="evenodd" 
      />
      <path 
        fillRule="evenodd" 
        d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" 
        clipRule="evenodd" 
      />
    </svg>
  );
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
  const hoverBg = venue === 'kalshi' ? 'hover:bg-kalshi/10' : 'hover:bg-polymarket/10';
  
  // Determine what to show based on connection status and data availability
  const showLoading = status === 'connected' && !hasData;
  const showDisconnected = status !== 'connected';
  
  return (
    <a
      href={VENUE_LINKS[venue]}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-2 py-1 rounded border border-gray-800 cursor-pointer transition-colors ${hoverBg}`}
    >
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
      <ExternalLinkIcon className="w-3 h-3 text-gray-500" />
    </a>
  );
}

export function TopBar({ book, isStale }: TopBarProps) {
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
