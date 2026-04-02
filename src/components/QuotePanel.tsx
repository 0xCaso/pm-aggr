'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import type { QuoteFill, QuoteResult, Side, Venue } from '@/lib/types';

interface QuotePanelProps {
  side: Side;
  onSideChange: (side: Side) => void;
}

function formatCents(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatDollars(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompactDollars(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

// Group fills by price level for display
interface GroupedFill {
  price: number;
  venues: { venue: Venue; shares: number; cost: number }[];
  totalShares: number;
  totalCost: number;
}

function groupFillsByPrice(fills: QuoteFill[]): GroupedFill[] {
  const byPrice = new Map<number, GroupedFill>();
  
  for (const fill of fills) {
    const roundedPrice = Math.round(fill.price * 1000) / 1000;
    if (!byPrice.has(roundedPrice)) {
      byPrice.set(roundedPrice, {
        price: roundedPrice,
        venues: [],
        totalShares: 0,
        totalCost: 0,
      });
    }
    const group = byPrice.get(roundedPrice)!;
    
    // Check if venue already exists at this price
    const existingVenue = group.venues.find(v => v.venue === fill.venue);
    if (existingVenue) {
      existingVenue.shares += fill.shares;
      existingVenue.cost += fill.cost;
    } else {
      group.venues.push({ venue: fill.venue, shares: fill.shares, cost: fill.cost });
    }
    group.totalShares += fill.shares;
    group.totalCost += fill.cost;
  }
  
  // Sort by price ascending
  return [...byPrice.values()].sort((a, b) => a.price - b.price);
}

const VENUE_COLORS: Record<Venue, string> = {
  polymarket: '#2F5CFF',
  kalshi: '#04D991',
};

const VENUE_LOGOS: Record<Venue, string> = {
  polymarket: '/logo-polymarket.png',
  kalshi: '/logo-kalshi.png',
};

export function QuotePanel({ side, onSideChange }: QuotePanelProps) {
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQuote = useCallback(
    async (dollarAmount: number, quoteSide: Side) => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: dollarAmount, side: quoteSide }),
        });
        if (!resp.ok) {
          const data = await resp.json();
          setError(data.error ?? 'Request failed');
          setQuote(null);
        } else {
          const data: QuoteResult = await resp.json();
          setQuote(data);
        }
      } catch {
        setError('Network error');
        setQuote(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchQuote(parsed, side);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [amount, side, fetchQuote]);

  // Calculate venue percentages for the split bar
  const polyPct = quote && quote.totalShares > 0
    ? (quote.venueBreakdown.polymarket.shares / quote.totalShares) * 100
    : 0;
  const kalshiPct = quote && quote.totalShares > 0
    ? (quote.venueBreakdown.kalshi.shares / quote.totalShares) * 100
    : 0;

  // Group fills by price for the breakdown view
  const groupedFills = quote ? groupFillsByPrice(quote.fills) : [];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Side toggle */}
      <div className="flex">
        <button
          onClick={() => onSideChange('yes')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-l border transition-all cursor-pointer ${
            side === 'yes'
              ? 'bg-green-600 border-green-500 text-white'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          YES
        </button>
        <button
          onClick={() => onSideChange('no')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-r border border-l-0 transition-all cursor-pointer ${
            side === 'no'
              ? 'bg-red-600 border-red-500 text-white'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          NO
        </button>
      </div>

      {/* Dollar input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          $
        </span>
        <input
          type="number"
          min="0"
          step="any"
          placeholder="Enter amount..."
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2.5 pl-7 text-sm text-gray-100 font-mono focus:outline-none focus:border-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      {/* Quote result */}
      {loading && (
        <div className="text-gray-500 text-sm">Calculating...</div>
      )}

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      {quote && !loading && (
        <div className="bg-gray-900 rounded border border-gray-800 p-4 space-y-3">
          {/* Quote Result Header */}
          <div className="font-host-grotesk text-xs text-gray-500 font-semibold uppercase tracking-wider">
            Quote Result
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-y-1.5 text-sm">
            <span className="text-gray-400">Shares:</span>
            <span className="text-gray-100 font-mono text-right">
              {formatNumber(quote.totalShares)}
            </span>

            <span className="text-gray-400">Avg Price:</span>
            <span className="text-gray-100 font-mono text-right">
              {formatCents(quote.avgPrice)}
            </span>

            <span className="text-gray-400">Total Cost:</span>
            <span className="text-gray-100 font-mono text-right">
              {formatDollars(quote.totalCost)}
            </span>
          </div>

          {/* Venue breakdown with distribution bar */}
          <div className="border-t border-gray-800 pt-3 mt-3">
            <div className="font-host-grotesk text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
              By Venue
            </div>
            
            <div className="space-y-2">
              {/* Polymarket row */}
              <div 
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded"
                style={{ 
                  borderLeft: '3px solid #2F5CFF',
                  backgroundColor: 'rgba(47, 92, 255, 0.05)'
                }}
              >
                <div className="flex items-center gap-2">
                  <Image
                    src="/logo-polymarket.png"
                    alt="Polymarket"
                    width={16}
                    height={16}
                    className="rounded-sm"
                  />
                  <span className="text-polymarket font-medium">Polymarket</span>
                </div>
                <span className="text-gray-300 font-mono text-xs">
                  {formatNumber(quote.venueBreakdown.polymarket.shares)} sh
                </span>
              </div>

              {/* Kalshi row */}
              <div 
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded"
                style={{ 
                  borderLeft: '3px solid #04D991',
                  backgroundColor: 'rgba(4, 217, 145, 0.05)'
                }}
              >
                <div className="flex items-center gap-2">
                  <Image
                    src="/logo-kalshi.png"
                    alt="Kalshi"
                    width={16}
                    height={16}
                    className="rounded-sm"
                  />
                  <span className="text-kalshi font-medium">Kalshi</span>
                </div>
                <span className="text-gray-300 font-mono text-xs">
                  {formatNumber(quote.venueBreakdown.kalshi.shares)} sh
                </span>
              </div>
            </div>

            {/* Fill distribution bar */}
            {quote.totalShares > 0 && (
              <div className="mt-3">
                <div className="h-2 rounded-full overflow-hidden flex">
                  {polyPct > 0 && (
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${polyPct}%`,
                        backgroundColor: '#2F5CFF'
                      }}
                    />
                  )}
                  {kalshiPct > 0 && (
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${kalshiPct}%`,
                        backgroundColor: '#04D991'
                      }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1 font-mono">
                  <span>{polyPct.toFixed(0)}%</span>
                  <span>{kalshiPct.toFixed(0)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Fill Details - grouped by price level */}
          {groupedFills.length > 0 && (
            <div className="border-t border-gray-800 pt-3 mt-3">
              <div className="font-host-grotesk text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                Fill Details
              </div>
              
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {groupedFills.map((group) => (
                  <div 
                    key={group.price}
                    className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-gray-800/50"
                  >
                    {/* Price */}
                    <span className="text-gray-100 font-mono w-12 shrink-0">
                      {formatCents(group.price)}
                    </span>
                    
                    {/* Venue pills */}
                    <div className="flex gap-1 flex-1 min-w-0">
                      {group.venues.map((v) => (
                        <div
                          key={v.venue}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                          style={{
                            backgroundColor: `${VENUE_COLORS[v.venue]}15`,
                            border: `1px solid ${VENUE_COLORS[v.venue]}40`,
                          }}
                        >
                          <Image
                            src={VENUE_LOGOS[v.venue]}
                            alt={v.venue}
                            width={12}
                            height={12}
                            className="rounded-sm"
                          />
                          <span className="font-mono text-gray-300">
                            {formatNumber(v.shares)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Cost at this level */}
                    <span className="text-gray-500 font-mono shrink-0">
                      {formatCompactDollars(group.totalCost)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Book exhausted warning */}
          {quote.bookExhausted && (
            <div className="text-yellow-400 text-xs mt-2 p-2 bg-yellow-400/10 rounded border border-yellow-400/20">
              Book exhausted — not enough liquidity to fill the full amount.
              Only {formatDollars(quote.totalCost)} of {formatDollars(parseFloat(amount))} was filled.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
