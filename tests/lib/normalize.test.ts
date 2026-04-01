import { describe, it, expect } from 'vitest';
import { normalizeDFlow, normalizePolymarket } from '@/lib/normalize';

describe('normalizeDFlow', () => {
  it('converts yes_bids to YES bids and NO asks', () => {
    // DFlow prices are in 0-1 range (e.g., "0.37" = 37 cents)
    const result = normalizeDFlow({
      yes_bids: { '0.37': '100', '0.36': '200' },
      no_bids: {},
    });

    // YES bids: directly from yes_bids
    expect(result.yes.bids).toEqual([
      { price: 0.37, size: 100, venue: 'kalshi' },
      { price: 0.36, size: 200, venue: 'kalshi' },
    ]);
    expect(result.yes.asks).toEqual([]);

    // NO asks: 1-P for each yes_bid
    expect(result.no.asks).toEqual([
      { price: 0.63, size: 100, venue: 'kalshi' },
      { price: 0.64, size: 200, venue: 'kalshi' },
    ]);
    expect(result.no.bids).toEqual([]);
  });

  it('converts no_bids to NO bids and YES asks', () => {
    const result = normalizeDFlow({
      yes_bids: {},
      no_bids: { '0.60': '150', '0.62': '50' },
    });

    // NO bids: directly from no_bids
    expect(result.no.bids).toEqual([
      { price: 0.62, size: 50, venue: 'kalshi' },
      { price: 0.60, size: 150, venue: 'kalshi' },
    ]);
    expect(result.no.asks).toEqual([]);

    // YES asks: 1-P for each no_bid
    expect(result.yes.asks).toEqual([
      { price: 0.38, size: 50, venue: 'kalshi' },
      { price: 0.40, size: 150, venue: 'kalshi' },
    ]);
    expect(result.yes.bids).toEqual([]);
  });

  it('handles both sides populated', () => {
    const result = normalizeDFlow({
      yes_bids: { '0.37': '100' },
      no_bids: { '0.62': '80' },
    });

    // YES book
    expect(result.yes.bids).toEqual([
      { price: 0.37, size: 100, venue: 'kalshi' },
    ]);
    expect(result.yes.asks).toEqual([
      { price: 0.38, size: 80, venue: 'kalshi' },
    ]);

    // NO book
    expect(result.no.bids).toEqual([
      { price: 0.62, size: 80, venue: 'kalshi' },
    ]);
    expect(result.no.asks).toEqual([
      { price: 0.63, size: 100, venue: 'kalshi' },
    ]);
  });

  it('returns empty books for empty input', () => {
    const result = normalizeDFlow({ yes_bids: {}, no_bids: {} });
    expect(result.yes.bids).toEqual([]);
    expect(result.yes.asks).toEqual([]);
    expect(result.no.bids).toEqual([]);
    expect(result.no.asks).toEqual([]);
  });

  it('sorts bids descending and asks ascending', () => {
    const result = normalizeDFlow({
      yes_bids: { '0.34': '10', '0.37': '20', '0.35': '30' },
      no_bids: {},
    });
    expect(result.yes.bids.map((l) => l.price)).toEqual([0.37, 0.35, 0.34]);
    expect(result.no.asks.map((l) => l.price)).toEqual([0.63, 0.65, 0.66]);
  });
});

describe('normalizePolymarket', () => {
  it('maps YES token bids/asks directly to YES book', () => {
    const result = normalizePolymarket({
      bids: [
        { price: '0.36', size: '500' },
        { price: '0.35', size: '300' },
      ],
      asks: [
        { price: '0.37', size: '400' },
        { price: '0.38', size: '200' },
      ],
    });

    expect(result.yes.bids).toEqual([
      { price: 0.36, size: 500, venue: 'polymarket' },
      { price: 0.35, size: 300, venue: 'polymarket' },
    ]);
    expect(result.yes.asks).toEqual([
      { price: 0.37, size: 400, venue: 'polymarket' },
      { price: 0.38, size: 200, venue: 'polymarket' },
    ]);
  });

  it('derives NO book from YES token (bid→NO ask, ask→NO bid)', () => {
    const result = normalizePolymarket({
      bids: [{ price: '0.36', size: '500' }],
      asks: [{ price: '0.37', size: '400' }],
    });

    // YES bid at 0.36 → NO ask at 0.64
    expect(result.no.asks).toEqual([
      { price: 0.64, size: 500, venue: 'polymarket' },
    ]);
    // YES ask at 0.37 → NO bid at 0.63
    expect(result.no.bids).toEqual([
      { price: 0.63, size: 400, venue: 'polymarket' },
    ]);
  });

  it('sorts derived NO book correctly', () => {
    const result = normalizePolymarket({
      bids: [
        { price: '0.36', size: '500' },
        { price: '0.34', size: '100' },
      ],
      asks: [
        { price: '0.37', size: '400' },
        { price: '0.39', size: '200' },
      ],
    });

    // NO bids from YES asks: (1-0.37)=0.63, (1-0.39)=0.61 → sorted desc
    expect(result.no.bids.map((l) => l.price)).toEqual([0.63, 0.61]);
    // NO asks from YES bids: (1-0.36)=0.64, (1-0.34)=0.66 → sorted asc
    expect(result.no.asks.map((l) => l.price)).toEqual([0.64, 0.66]);
  });

  it('returns empty books for empty input', () => {
    const result = normalizePolymarket({ bids: [], asks: [] });
    expect(result.yes.bids).toEqual([]);
    expect(result.yes.asks).toEqual([]);
    expect(result.no.bids).toEqual([]);
    expect(result.no.asks).toEqual([]);
  });
});
