import { describe, it, expect, vi } from 'vitest';
import { BookManager } from '@/server/book-manager';

describe('BookManager', () => {
  it('starts with empty books', () => {
    const mgr = new BookManager();
    const merged = mgr.getMergedBook();

    expect(merged.yes.bids).toEqual([]);
    expect(merged.yes.asks).toEqual([]);
    expect(merged.no.bids).toEqual([]);
    expect(merged.no.asks).toEqual([]);
    expect(merged.venueStatus.kalshi).toBe('disconnected');
    expect(merged.venueStatus.polymarket).toBe('disconnected');
  });

  it('stores a venue book and returns it in merged output', () => {
    const mgr = new BookManager();
    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
        asks: [{ price: 0.38, size: 80, venue: 'kalshi' }],
      },
      no: {
        bids: [{ price: 0.62, size: 80, venue: 'kalshi' }],
        asks: [{ price: 0.63, size: 100, venue: 'kalshi' }],
      },
    });

    const merged = mgr.getMergedBook();
    expect(merged.yes.bids).toEqual([
      { price: 0.37, size: 100, venue: 'kalshi' },
    ]);
    expect(merged.yes.asks).toEqual([
      { price: 0.38, size: 80, venue: 'kalshi' },
    ]);
  });

  it('merges books from both venues sorted correctly', () => {
    const mgr = new BookManager();
    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
        asks: [{ price: 0.38, size: 80, venue: 'kalshi' }],
      },
      no: { bids: [], asks: [] },
    });
    mgr.updateVenueBook('polymarket', {
      yes: {
        bids: [{ price: 0.36, size: 200, venue: 'polymarket' }],
        asks: [{ price: 0.37, size: 150, venue: 'polymarket' }],
      },
      no: { bids: [], asks: [] },
    });

    const merged = mgr.getMergedBook();
    // Bids: 0.37K, 0.36P (descending)
    expect(merged.yes.bids.map((l) => l.price)).toEqual([0.37, 0.36]);
    expect(merged.yes.bids.map((l) => l.venue)).toEqual(['kalshi', 'polymarket']);
    // Asks: 0.37P, 0.38K (ascending)
    expect(merged.yes.asks.map((l) => l.price)).toEqual([0.37, 0.38]);
    expect(merged.yes.asks.map((l) => l.venue)).toEqual(['polymarket', 'kalshi']);
  });

  it('updates venue status', () => {
    const mgr = new BookManager();
    mgr.updateVenueStatus('kalshi', 'connected');
    mgr.updateVenueStatus('polymarket', 'reconnecting');

    const merged = mgr.getMergedBook();
    expect(merged.venueStatus.kalshi).toBe('connected');
    expect(merged.venueStatus.polymarket).toBe('reconnecting');
  });

  it('fires onChange when venue book is updated', () => {
    const mgr = new BookManager();
    const cb = vi.fn();
    mgr.onChange(cb);

    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
        asks: [],
      },
      no: { bids: [], asks: [] },
    });

    expect(cb).toHaveBeenCalledTimes(1);
    const arg = cb.mock.calls[0][0];
    expect(arg.yes.bids).toHaveLength(1);
  });

  it('fires onChange when venue status changes', () => {
    const mgr = new BookManager();
    const cb = vi.fn();
    mgr.onChange(cb);

    mgr.updateVenueStatus('polymarket', 'connected');

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('replaces previous venue book on update', () => {
    const mgr = new BookManager();

    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.37, size: 100, venue: 'kalshi' }],
        asks: [],
      },
      no: { bids: [], asks: [] },
    });

    mgr.updateVenueBook('kalshi', {
      yes: {
        bids: [{ price: 0.38, size: 50, venue: 'kalshi' }],
        asks: [],
      },
      no: { bids: [], asks: [] },
    });

    const merged = mgr.getMergedBook();
    expect(merged.yes.bids).toEqual([
      { price: 0.38, size: 50, venue: 'kalshi' },
    ]);
  });
});
