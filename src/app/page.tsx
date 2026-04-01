'use client';

import { useState } from 'react';
import { useOrderBook } from '@/hooks/useOrderBook';
import { StatusBanner } from '@/components/StatusBanner';
import { MarketHeader } from '@/components/MarketHeader';
import { OrderBook } from '@/components/OrderBook';
import { QuotePanel } from '@/components/QuotePanel';
import type { Side } from '@/lib/types';

export default function Home() {
  const { book, relayStatus, isStale } = useOrderBook();
  const [side, setSide] = useState<Side>('yes');

  return (
    <main className="min-h-screen flex flex-col">
      {/* Status banner */}
      <StatusBanner
        relayStatus={relayStatus}
        venueStatus={book?.venueStatus}
        isStale={isStale}
      />

      {/* Market header */}
      <MarketHeader book={book} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-0">
        {/* Order book section */}
        <div className="flex-1 border-r border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Order Book ({side.toUpperCase()})
            </h2>
            {/* Side selector for order book */}
            <div className="flex gap-1">
              <button
                onClick={() => setSide('yes')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  side === 'yes'
                    ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                    : 'bg-gray-900 text-gray-500 hover:text-gray-300'
                }`}
              >
                YES
              </button>
              <button
                onClick={() => setSide('no')}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                  side === 'no'
                    ? 'bg-red-600/20 text-red-400 border border-red-600/40'
                    : 'bg-gray-900 text-gray-500 hover:text-gray-300'
                }`}
              >
                NO
              </button>
            </div>
          </div>

          {book ? (
            <OrderBook book={book} side={side} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-600">
              Waiting for data...
            </div>
          )}
        </div>

        {/* Quote panel section */}
        <div className="w-full lg:w-80 p-4 border-t lg:border-t-0 border-gray-800">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Quote Calculator
          </h2>
          <QuotePanel side={side} onSideChange={setSide} />
        </div>
      </div>
    </main>
  );
}
