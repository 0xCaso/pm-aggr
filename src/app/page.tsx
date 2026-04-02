'use client';

import { useState } from 'react';
import { useOrderBook } from '@/hooks/useOrderBook';
import { TopBar } from '@/components/TopBar';
import { OrderBook } from '@/components/OrderBook';
import { QuotePanel } from '@/components/QuotePanel';
import type { Side } from '@/lib/types';

export default function Home() {
  const { book, isStale } = useOrderBook();
  const [side, setSide] = useState<Side>('yes');

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-gray-950">
      {/* Combined top bar: title + status */}
      <TopBar
        book={book}
        isStale={isStale}
      />

      {/* Main content area - 2/3 orderbook + 1/3 quote */}
      <div className="flex-1 flex min-h-0">
        {/* Order book section - 2/3 width */}
        <div className="flex-[2] flex flex-col min-h-0 border-r border-gray-800/50">
          {/* Order book header with controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 shrink-0">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Order Book
            </h2>
            
            {/* Side selector */}
            <div className="flex rounded-md overflow-hidden border border-gray-700/80">
              <button
                onClick={() => setSide('yes')}
                className={`px-3 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                  side === 'yes'
                    ? 'bg-green-500/15 text-green-400'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                YES
              </button>
              <button
                onClick={() => setSide('no')}
                className={`px-3 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer border-l border-gray-700/80 ${
                  side === 'no'
                    ? 'bg-red-500/15 text-red-400'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                NO
              </button>
            </div>
          </div>

          {/* Order book content */}
          {book ? (
            <div className="flex-1 min-h-0">
              <OrderBook book={book} side={side} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
              Waiting for data...
            </div>
          )}
        </div>

        {/* Quote panel section - 1/3 width */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-gray-800/50 shrink-0">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Quote Calculator
            </h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto min-h-0">
            <QuotePanel side={side} onSideChange={setSide} />
          </div>
        </div>
      </div>
    </main>
  );
}
