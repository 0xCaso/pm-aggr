import { describe, it, expect } from 'vitest';
import { calculateQuote } from '@/lib/quote';
import type { OrderBook } from '@/lib/types';

describe('calculateQuote', () => {
  it('fills a single level completely', () => {
    const asks: OrderBook = {
      bids: [],
      asks: [{ price: 0.40, size: 1000, venue: 'kalshi' }],
    };

    const result = calculateQuote(asks, 100);

    expect(result.totalShares).toBe(250);
    expect(result.totalCost).toBeCloseTo(100, 6);
    expect(result.avgPrice).toBeCloseTo(0.40, 6);
    expect(result.bookExhausted).toBe(false);
    expect(result.fills).toEqual([
      { venue: 'kalshi', price: 0.40, shares: 250, cost: 100 },
    ]);
    expect(result.venueBreakdown.kalshi).toEqual({ shares: 250, cost: 100 });
    expect(result.venueBreakdown.polymarket).toEqual({ shares: 0, cost: 0 });
  });

  it('fills across multiple levels and venues', () => {
    const asks: OrderBook = {
      bids: [],
      asks: [
        { price: 0.36, size: 100, venue: 'polymarket' },
        { price: 0.37, size: 200, venue: 'kalshi' },
        { price: 0.38, size: 300, venue: 'polymarket' },
      ],
    };

    // Budget: $50
    // Level 1: 0.36 × 100 = $36 cost, 100 shares. Remaining: $14
    // Level 2: $14 / 0.37 = 37.837... shares (partial). Cost: ~$14
    const result = calculateQuote(asks, 50);

    expect(result.fills).toHaveLength(2);
    expect(result.fills[0]).toEqual({
      venue: 'polymarket',
      price: 0.36,
      shares: 100,
      cost: 36,
    });
    // Partial fill of level 2
    expect(result.fills[1].venue).toBe('kalshi');
    expect(result.fills[1].price).toBe(0.37);
    expect(result.fills[1].cost).toBeCloseTo(14, 6);
    expect(result.fills[1].shares).toBeCloseTo(14 / 0.37, 4);

    expect(result.totalCost).toBeCloseTo(50, 6);
    expect(result.totalShares).toBeCloseTo(100 + 14 / 0.37, 4);
    expect(result.bookExhausted).toBe(false);
  });

  it('reports book exhausted when budget exceeds available', () => {
    const asks: OrderBook = {
      bids: [],
      asks: [{ price: 0.50, size: 10, venue: 'kalshi' }],
    };

    // Can buy 10 shares at $0.50 = $5. Budget is $100.
    const result = calculateQuote(asks, 100);

    expect(result.totalShares).toBe(10);
    expect(result.totalCost).toBeCloseTo(5, 6);
    expect(result.bookExhausted).toBe(true);
  });

  it('returns zero for empty book', () => {
    const asks: OrderBook = { bids: [], asks: [] };
    const result = calculateQuote(asks, 100);

    expect(result.totalShares).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.avgPrice).toBe(0);
    expect(result.bookExhausted).toBe(true);
    expect(result.fills).toEqual([]);
  });

  it('returns zero for zero budget', () => {
    const asks: OrderBook = {
      bids: [],
      asks: [{ price: 0.40, size: 1000, venue: 'kalshi' }],
    };
    const result = calculateQuote(asks, 0);

    expect(result.totalShares).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.avgPrice).toBe(0);
    expect(result.bookExhausted).toBe(false);
    expect(result.fills).toEqual([]);
  });

  it('tracks venue breakdown across multiple fills', () => {
    const asks: OrderBook = {
      bids: [],
      asks: [
        { price: 0.40, size: 100, venue: 'polymarket' },
        { price: 0.40, size: 100, venue: 'kalshi' },
      ],
    };

    // Budget: $80 → buy all 100 from poly ($40) + all 100 from kalshi ($40)
    const result = calculateQuote(asks, 80);

    expect(result.venueBreakdown.polymarket).toEqual({ shares: 100, cost: 40 });
    expect(result.venueBreakdown.kalshi).toEqual({ shares: 100, cost: 40 });
    expect(result.totalShares).toBe(200);
    expect(result.totalCost).toBeCloseTo(80, 6);
  });
});
