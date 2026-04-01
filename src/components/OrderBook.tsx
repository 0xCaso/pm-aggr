'use client';

import { useState } from 'react';
import type { OrderBook as OrderBookType, PriceLevel, Side, Venue } from '@/lib/types';

type VenueFilter = 'combined' | Venue;
type PriceGrouping = 0.001 | 0.01; // 0.1¢ or 1¢

interface OrderBookProps {
  book: { yes: OrderBookType; no: OrderBookType } | null;
  side: Side;
}

// Show more levels since we have scrolling
const MAX_LEVELS = 50;

// Aggregate levels by price, tracking per-venue breakdown
interface AggregatedLevel {
  price: number;
  totalSize: number;
  venues: { venue: Venue; size: number }[];
}

function roundToGrouping(price: number, grouping: PriceGrouping): number {
  return Math.round(price / grouping) * grouping;
}

function aggregateLevels(
  levels: PriceLevel[], 
  filter: VenueFilter, 
  grouping: PriceGrouping
): AggregatedLevel[] {
  // First filter by venue if needed
  const filtered = filter === 'combined' ? levels : levels.filter((l) => l.venue === filter);
  
  // Group by rounded price
  const byPrice = new Map<number, Map<Venue, number>>();
  for (const level of filtered) {
    // Skip levels with zero or near-zero size
    if (level.size < 0.01) continue;
    
    const roundedPrice = roundToGrouping(level.price, grouping);
    // Skip zero or invalid prices
    if (roundedPrice <= 0) continue;
    
    if (!byPrice.has(roundedPrice)) {
      byPrice.set(roundedPrice, new Map());
    }
    const venueMap = byPrice.get(roundedPrice)!;
    venueMap.set(level.venue, (venueMap.get(level.venue) || 0) + level.size);
  }
  
  // Convert to aggregated array
  const result: AggregatedLevel[] = [];
  for (const [price, venueMap] of byPrice) {
    const venues: { venue: Venue; size: number }[] = [];
    // Polymarket first, then Kalshi
    if (venueMap.has('polymarket')) {
      venues.push({ venue: 'polymarket', size: venueMap.get('polymarket')! });
    }
    if (venueMap.has('kalshi')) {
      venues.push({ venue: 'kalshi', size: venueMap.get('kalshi')! });
    }
    const totalSize = venues.reduce((sum, v) => sum + v.size, 0);
    // Skip aggregated levels with zero total size
    if (totalSize < 0.01) continue;
    result.push({ price, totalSize, venues });
  }
  
  // Sort by price (descending for display)
  result.sort((a, b) => b.price - a.price);
  
  return result;
}

function formatPrice(price: number, grouping: PriceGrouping): string {
  const decimals = grouping === 0.001 ? 1 : 0;
  return `${(price * 100).toFixed(decimals)}¢`;
}

function formatSize(size: number): string {
  if (size >= 1000) return `${(size / 1000).toFixed(1)}k`;
  return size.toFixed(0);
}

function formatDollars(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

// Liquidity bar - rendered separately on the left side
function LiquidityBar({
  level,
  maxSize,
}: {
  level: AggregatedLevel;
  maxSize: number;
}) {
  const totalPct = maxSize > 0 ? (level.totalSize / maxSize) * 100 : 0;
  
  // Calculate each venue's proportion
  const venueBars = level.venues.map((v) => ({
    venue: v.venue,
    pct: level.totalSize > 0 ? (v.size / level.totalSize) * 100 : 0,
  }));
  
  return (
    <div className="h-3 flex rounded-sm overflow-hidden bg-gray-800/40 flex-1">
      {venueBars.map((bar) => {
        const baseColor = bar.venue === 'polymarket' 
          ? 'rgba(47, 92, 255, 0.8)' 
          : 'rgba(4, 217, 145, 0.8)';
        const widthPct = (bar.pct / 100) * totalPct;
        return (
          <div
            key={bar.venue}
            className="h-full"
            style={{ width: `${widthPct}%`, backgroundColor: baseColor }}
          />
        );
      })}
    </div>
  );
}

function LevelRow({
  level,
  maxSize,
  type,
  cumulativeValue,
  grouping,
}: {
  level: AggregatedLevel;
  maxSize: number;
  type: 'bid' | 'ask';
  cumulativeValue: number;
  grouping: PriceGrouping;
}) {
  const textColor = type === 'bid' ? 'text-bid' : 'text-ask';

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-0.5 text-sm hover:bg-gray-800/20 transition-colors">
      {/* Liquidity bar */}
      <LiquidityBar level={level} maxSize={maxSize} />
      
      {/* Price */}
      <span className={`w-14 text-right tabular-nums ${textColor}`}>
        {formatPrice(level.price, grouping)}
      </span>
      
      {/* Contracts/Size */}
      <span className="w-14 text-right text-gray-300 tabular-nums">
        {formatSize(level.totalSize)}
      </span>
      
      {/* Dollar value */}
      <span className="w-16 text-right text-gray-500 tabular-nums">
        {formatDollars(cumulativeValue)}
      </span>
    </div>
  );
}

function Spread({ bestBid, bestAsk }: { bestBid: number | null; bestAsk: number | null }) {
  if (bestBid === null || bestAsk === null) {
    return (
      <div className="py-1.5 px-4 text-center text-gray-600 text-xs border-y border-gray-800/50 shrink-0">
        —
      </div>
    );
  }
  
  const spread = bestAsk - bestBid;
  const spreadCents = (spread * 100).toFixed(1);
  
  return (
    <div className="py-1.5 px-4 text-center border-y border-gray-800/50 bg-gray-900/30 shrink-0">
      <span className="text-gray-500 text-xs">Spread </span>
      <span className="text-gray-300 text-xs font-medium tabular-nums">{spreadCents}¢</span>
    </div>
  );
}

export function OrderBook({ book, side }: OrderBookProps) {
  const [filter, setFilter] = useState<VenueFilter>('combined');
  const [grouping, setGrouping] = useState<PriceGrouping>(0.001);

  const sideBook = book ? book[side] : null;
  
  // Get raw levels
  const rawBids = sideBook?.bids || [];
  const rawAsks = sideBook?.asks || [];
  
  // Aggregate by price with grouping
  const allBids = aggregateLevels(rawBids, filter, grouping);
  const allAsks = aggregateLevels(rawAsks, filter, grouping);
  
  // For display: bids sorted high to low (already done), asks sorted low to high then take closest to spread
  const bids = allBids.slice(0, MAX_LEVELS);
  // allAsks is sorted high to low, reverse to get low to high, take first MAX_LEVELS (closest to spread)
  const asksLowToHigh = [...allAsks].reverse();
  const asks = asksLowToHigh.slice(0, MAX_LEVELS);
  
  // For asks display: highest at top, lowest near spread (reverse back)
  const displayAsks = [...asks].reverse();
  
  // Calculate max size for bar scaling (across both sides)
  const maxBidSize = bids.reduce((max, l) => Math.max(max, l.totalSize), 0);
  const maxAskSize = asks.reduce((max, l) => Math.max(max, l.totalSize), 0);
  const maxSize = Math.max(maxBidSize, maxAskSize);
  
  // Best bid/ask for spread
  const bestBid = bids.length > 0 ? bids[0].price : null;
  const bestAsk = asks.length > 0 ? asks[0].price : null;

  // Calculate cumulative dollar values
  // For asks (displayed top to bottom, high to low), cumulative from spread outward
  let askCumulative = 0;
  const askCumulatives = new Map<number, number>();
  for (const level of asks) { // asks is low to high, so cumulative builds from spread
    askCumulative += level.price * level.totalSize;
    askCumulatives.set(level.price, askCumulative);
  }
  
  // For bids (displayed top to bottom, high to low), cumulative from best bid down
  let bidCumulative = 0;
  const bidCumulatives = new Map<number, number>();
  for (const level of bids) {
    bidCumulative += level.price * level.totalSize;
    bidCumulatives.set(level.price, bidCumulative);
  }

  const filterOptions: { value: VenueFilter; label: string; color?: string }[] = [
    { value: 'combined', label: 'All' },
    { value: 'polymarket', label: 'Polymarket', color: 'polymarket' },
    { value: 'kalshi', label: 'Kalshi', color: 'kalshi' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-4 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-800/50 shrink-0">
        <span>Depth</span>
        <span className="w-14 text-right">Price</span>
        <span className="w-14 text-right">Size</span>
        <span className="w-16 text-right">Total</span>
      </div>

      {/* Scrollable order book area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Asks section - scrollable, uses flex-col-reverse so lowest prices are at bottom near spread */}
        <div className="h-1/2 overflow-y-auto flex flex-col-reverse">
          {displayAsks.length === 0 ? (
            <div className="text-gray-600 text-xs px-4 py-2 text-center">
              No asks
            </div>
          ) : (
            // Reverse the array since flex-col-reverse will flip the display order
            [...displayAsks].reverse().map((level, i) => (
              <LevelRow
                key={`ask-${level.price}-${i}`}
                level={level}
                maxSize={maxSize}
                type="ask"
                cumulativeValue={askCumulatives.get(level.price) || 0}
                grouping={grouping}
              />
            ))
          )}
        </div>

        {/* Spread */}
        <Spread bestBid={bestBid} bestAsk={bestAsk} />

        {/* Bids section - scrollable */}
        <div className="h-1/2 overflow-y-auto">
          {bids.length === 0 ? (
            <div className="text-gray-600 text-xs px-4 py-2 text-center">
              No bids
            </div>
          ) : (
            bids.map((level, i) => (
              <LevelRow
                key={`bid-${level.price}-${i}`}
                level={level}
                maxSize={maxSize}
                type="bid"
                cumulativeValue={bidCumulatives.get(level.price) || 0}
                grouping={grouping}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer with controls and legend */}
      <div className="flex items-center justify-between gap-4 px-4 py-2 border-t border-gray-800/50 shrink-0">
        {/* Venue filter toggle */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-md overflow-hidden border border-gray-700/80">
            {filterOptions.map((opt, i) => {
              const isActive = filter === opt.value;
              let activeStyle = 'bg-gray-700 text-gray-100';
              if (isActive && opt.color === 'polymarket') {
                activeStyle = 'text-polymarket';
              } else if (isActive && opt.color === 'kalshi') {
                activeStyle = 'text-kalshi';
              }
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    i > 0 ? 'border-l border-gray-700/80' : ''
                  } ${isActive ? activeStyle : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
                  style={isActive && opt.color ? { 
                    backgroundColor: opt.color === 'polymarket' ? 'rgba(47, 92, 255, 0.15)' : 'rgba(4, 217, 145, 0.15)'
                  } : undefined}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          
          {/* Grouping toggle */}
          <div className="flex rounded-md overflow-hidden border border-gray-700/80">
            <button
              onClick={() => setGrouping(0.001)}
              className={`px-2 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                grouping === 0.001 
                  ? 'bg-gray-700 text-gray-100' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              0.1¢
            </button>
            <button
              onClick={() => setGrouping(0.01)}
              className={`px-2 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer border-l border-gray-700/80 ${
                grouping === 0.01 
                  ? 'bg-gray-700 text-gray-100' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              1¢
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(47, 92, 255, 0.8)' }} />
            <span>Poly</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm" style={{ backgroundColor: 'rgba(4, 217, 145, 0.8)' }} />
            <span>Kalshi</span>
          </span>
        </div>
      </div>
    </div>
  );
}
