import type { OrderBook, PriceLevel } from './types';

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export interface DFlowRawBook {
  yes_bids: Record<string, string>;
  no_bids: Record<string, string>;
}

export interface PolymarketRawBook {
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
}

interface TwoSidedBook {
  yes: OrderBook;
  no: OrderBook;
}

export function normalizeDFlow(raw: DFlowRawBook): TwoSidedBook {
  const yesBids: PriceLevel[] = [];
  const noAsks: PriceLevel[] = [];

  // DFlow prices are already in 0-1 range (e.g., "0.37" = 37 cents = 0.37)
  for (const [priceStr, sizeStr] of Object.entries(raw.yes_bids)) {
    const price = Number(priceStr);
    const size = Number(sizeStr);
    yesBids.push({ price, size, venue: 'kalshi' });
    noAsks.push({ price: round(1 - price), size, venue: 'kalshi' });
  }

  const noBids: PriceLevel[] = [];
  const yesAsks: PriceLevel[] = [];

  for (const [priceStr, sizeStr] of Object.entries(raw.no_bids)) {
    const price = Number(priceStr);
    const size = Number(sizeStr);
    noBids.push({ price, size, venue: 'kalshi' });
    yesAsks.push({ price: round(1 - price), size, venue: 'kalshi' });
  }

  return {
    yes: {
      bids: yesBids.sort((a, b) => b.price - a.price),
      asks: yesAsks.sort((a, b) => a.price - b.price),
    },
    no: {
      bids: noBids.sort((a, b) => b.price - a.price),
      asks: noAsks.sort((a, b) => a.price - b.price),
    },
  };
}

export function normalizePolymarket(raw: PolymarketRawBook): TwoSidedBook {
  const yesBids: PriceLevel[] = raw.bids.map((l) => ({
    price: Number(l.price),
    size: Number(l.size),
    venue: 'polymarket' as const,
  }));
  const yesAsks: PriceLevel[] = raw.asks.map((l) => ({
    price: Number(l.price),
    size: Number(l.size),
    venue: 'polymarket' as const,
  }));

  // Derive NO book from YES token
  // YES bid at P → NO ask at 1-P
  const noAsks: PriceLevel[] = yesBids
    .map((l) => ({
      price: round(1 - l.price),
      size: l.size,
      venue: 'polymarket' as const,
    }))
    .sort((a, b) => a.price - b.price);

  // YES ask at P → NO bid at 1-P
  const noBids: PriceLevel[] = yesAsks
    .map((l) => ({
      price: round(1 - l.price),
      size: l.size,
      venue: 'polymarket' as const,
    }))
    .sort((a, b) => b.price - a.price);

  return {
    yes: {
      bids: yesBids.sort((a, b) => b.price - a.price),
      asks: yesAsks.sort((a, b) => a.price - b.price),
    },
    no: {
      bids: noBids,
      asks: noAsks,
    },
  };
}
