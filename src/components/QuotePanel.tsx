'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { QuoteResult, Side } from '@/lib/types';

interface QuotePanelProps {
  side: Side;
  onSideChange: (side: Side) => void;
}

function formatCents(price: number): string {
  return `${(price * 100).toFixed(2)}¢`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatDollars(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

  return (
    <div className="flex flex-col gap-4">
      {/* Side toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => onSideChange('yes')}
          className={`flex-1 py-2 text-sm font-medium rounded-l transition-colors ${
            side === 'yes'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          YES
        </button>
        <button
          onClick={() => onSideChange('no')}
          className={`flex-1 py-2 text-sm font-medium rounded-r transition-colors ${
            side === 'no'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200'
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
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 pl-7 text-sm text-gray-100 font-mono focus:outline-none focus:border-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
        <div className="bg-gray-900 rounded border border-gray-800 p-3 space-y-2">
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">
            Quote Result
          </div>

          <div className="grid grid-cols-2 gap-y-1 text-sm">
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

          {/* Venue breakdown */}
          <div className="border-t border-gray-800 pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-blue-400">Kalshi:</span>
              <span className="text-gray-300 font-mono">
                {formatNumber(quote.venueBreakdown.kalshi.shares)} shares ({formatDollars(quote.venueBreakdown.kalshi.cost)})
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-400">Polymarket:</span>
              <span className="text-gray-300 font-mono">
                {formatNumber(quote.venueBreakdown.polymarket.shares)} shares ({formatDollars(quote.venueBreakdown.polymarket.cost)})
              </span>
            </div>
          </div>

          {/* Book exhausted warning */}
          {quote.bookExhausted && (
            <div className="text-yellow-400 text-xs mt-2 p-2 bg-yellow-400/10 rounded">
              Book exhausted — not enough liquidity to fill the full amount.
              Only {formatDollars(quote.totalCost)} of {formatDollars(parseFloat(amount))} was filled.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
