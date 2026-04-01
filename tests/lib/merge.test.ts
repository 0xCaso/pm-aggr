import { describe, it, expect } from 'vitest';
import { mergeBooks } from '@/lib/merge';
import type { OrderBook } from '@/lib/types';

describe('mergeBooks', () => {
  it('merges bids in descending order across venues', () => {
    const a: OrderBook = {
      bids: [
        { price: 0.37, size: 100, venue: 'kalshi' },
        { price: 0.35, size: 200, venue: 'kalshi' },
      ],
      asks: [],
    };
    const b: OrderBook = {
      bids: [
        { price: 0.36, size: 300, venue: 'polymarket' },
        { price: 0.34, size: 400, venue: 'polymarket' },
      ],
      asks: [],
    };

    const result = mergeBooks(a, b);
    expect(result.bids).toEqual([
      { price: 0.37, size: 100, venue: 'kalshi' },
      { price: 0.36, size: 300, venue: 'polymarket' },
      { price: 0.35, size: 200, venue: 'kalshi' },
      { price: 0.34, size: 400, venue: 'polymarket' },
    ]);
  });

  it('merges asks in ascending order across venues', () => {
    const a: OrderBook = {
      bids: [],
      asks: [
        { price: 0.38, size: 100, venue: 'kalshi' },
        { price: 0.40, size: 200, venue: 'kalshi' },
      ],
    };
    const b: OrderBook = {
      bids: [],
      asks: [
        { price: 0.37, size: 300, venue: 'polymarket' },
        { price: 0.39, size: 400, venue: 'polymarket' },
      ],
    };

    const result = mergeBooks(a, b);
    expect(result.asks).toEqual([
      { price: 0.37, size: 300, venue: 'polymarket' },
      { price: 0.38, size: 100, venue: 'kalshi' },
      { price: 0.39, size: 400, venue: 'polymarket' },
      { price: 0.40, size: 200, venue: 'kalshi' },
    ]);
  });

  it('preserves separate entries at same price from different venues', () => {
    const a: OrderBook = {
      bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
      asks: [],
    };
    const b: OrderBook = {
      bids: [{ price: 0.37, size: 200, venue: 'polymarket' }],
      asks: [],
    };

    const result = mergeBooks(a, b);
    expect(result.bids).toHaveLength(2);
    expect(result.bids[0]).toEqual({ price: 0.37, size: 100, venue: 'kalshi' });
    expect(result.bids[1]).toEqual({ price: 0.37, size: 200, venue: 'polymarket' });
  });

  it('handles one empty book', () => {
    const a: OrderBook = {
      bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
      asks: [{ price: 0.38, size: 50, venue: 'kalshi' }],
    };
    const empty: OrderBook = { bids: [], asks: [] };

    const result = mergeBooks(a, empty);
    expect(result.bids).toEqual(a.bids);
    expect(result.asks).toEqual(a.asks);
  });

  it('handles both empty books', () => {
    const empty: OrderBook = { bids: [], asks: [] };
    const result = mergeBooks(empty, empty);
    expect(result.bids).toEqual([]);
    expect(result.asks).toEqual([]);
  });

  it('merges full books with interleaved prices', () => {
    const kalshi: OrderBook = {
      bids: [
        { price: 0.37, size: 100, venue: 'kalshi' },
        { price: 0.35, size: 150, venue: 'kalshi' },
      ],
      asks: [
        { price: 0.38, size: 80, venue: 'kalshi' },
        { price: 0.40, size: 120, venue: 'kalshi' },
      ],
    };
    const poly: OrderBook = {
      bids: [
        { price: 0.36, size: 200, venue: 'polymarket' },
        { price: 0.34, size: 250, venue: 'polymarket' },
      ],
      asks: [
        { price: 0.37, size: 300, venue: 'polymarket' },
        { price: 0.39, size: 180, venue: 'polymarket' },
      ],
    };

    const result = mergeBooks(kalshi, poly);

    // Bids: 0.37K, 0.36P, 0.35K, 0.34P
    expect(result.bids.map((l) => l.price)).toEqual([0.37, 0.36, 0.35, 0.34]);
    // Asks: 0.37P, 0.38K, 0.39P, 0.40K
    expect(result.asks.map((l) => l.price)).toEqual([0.37, 0.38, 0.39, 0.40]);
  });
});
