// ── Venue & Side ──

export type Venue = 'kalshi' | 'polymarket';
export type Side = 'yes' | 'no';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

// ── Order Book ──

export interface PriceLevel {
  price: number;  // 0-1 range (e.g., 0.42 = 42 cents)
  size: number;   // number of contracts/shares
  venue: Venue;
}

export interface OrderBook {
  bids: PriceLevel[];  // sorted descending by price (best bid first)
  asks: PriceLevel[];  // sorted ascending by price (best ask first)
}

export interface NormalizedBook {
  yes: OrderBook;
  no: OrderBook;
  venueStatus: Record<Venue, ConnectionStatus>;
  timestamp: number;  // ms since epoch
}

// ── Quote ──

export interface QuoteRequest {
  amount: number;   // dollar amount to spend
  side: Side;       // which outcome to buy
}

export interface QuoteFill {
  venue: Venue;
  price: number;
  shares: number;
  cost: number;
}

export interface QuoteResult {
  totalShares: number;
  totalCost: number;
  avgPrice: number;
  fills: QuoteFill[];
  venueBreakdown: Record<Venue, { shares: number; cost: number }>;
  bookExhausted: boolean;
}

// ── WebSocket Messages (backend → browser) ──

export interface SnapshotMessage {
  type: 'snapshot';
  data: NormalizedBook;
}

export interface StatusMessage {
  type: 'status';
  data: {
    venue: Venue;
    status: ConnectionStatus;
  };
}

export type WSMessage = SnapshotMessage | StatusMessage;

// ── Market Config ──

export const MARKET = {
  title: 'Will JD Vance win the 2028 Republican presidential nomination?',
  kalshiTicker: 'KXPRESNOMR-28-JDV',
  polymarketYesToken:
    '40081275558852222228080198821361202017557872256707631666334039001378518619916',
  polymarketNoToken:
    '78633590736077251574794513664747155551297291244492840448622550955320930591622',
} as const;
