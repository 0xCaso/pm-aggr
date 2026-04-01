import { mergeBooks } from '@/lib/merge';
import type {
  ConnectionStatus,
  NormalizedBook,
  OrderBook,
  Venue,
} from '@/lib/types';

const EMPTY_BOOK: OrderBook = { bids: [], asks: [] };

export class BookManager {
  private venueBooks: Record<Venue, { yes: OrderBook; no: OrderBook }> = {
    kalshi: { yes: EMPTY_BOOK, no: EMPTY_BOOK },
    polymarket: { yes: EMPTY_BOOK, no: EMPTY_BOOK },
  };

  private venueStatus: Record<Venue, ConnectionStatus> = {
    kalshi: 'disconnected',
    polymarket: 'disconnected',
  };

  private changeCb: ((book: NormalizedBook) => void) | null = null;

  onChange(cb: (book: NormalizedBook) => void): void {
    this.changeCb = cb;
  }

  updateVenueBook(
    venue: Venue,
    book: { yes: OrderBook; no: OrderBook },
  ): void {
    this.venueBooks[venue] = book;
    this.notify();
  }

  updateVenueStatus(venue: Venue, status: ConnectionStatus): void {
    this.venueStatus[venue] = status;
    this.notify();
  }

  getMergedBook(): NormalizedBook {
    const k = this.venueBooks.kalshi;
    const p = this.venueBooks.polymarket;

    return {
      yes: mergeBooks(k.yes, p.yes),
      no: mergeBooks(k.no, p.no),
      venueStatus: { ...this.venueStatus },
      timestamp: Date.now(),
    };
  }

  private notify(): void {
    this.changeCb?.(this.getMergedBook());
  }
}
