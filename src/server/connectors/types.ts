import type { ConnectionStatus, OrderBook } from '@/lib/types';

export interface VenueConnector {
  connect(): void;
  disconnect(): void;
  onBookUpdate(cb: (book: { yes: OrderBook; no: OrderBook }) => void): void;
  onStatusChange(cb: (status: ConnectionStatus) => void): void;
  getStatus(): ConnectionStatus;
}
