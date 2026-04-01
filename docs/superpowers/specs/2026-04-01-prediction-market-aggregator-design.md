# Prediction Market Aggregator — Design Spec

## Overview

A web application that displays a combined order book from Polymarket and Kalshi for a single binary prediction market, with real-time updates and a quote calculator.

**Market:** "Will JD Vance win the 2028 Republican presidential nomination?"
- Kalshi ticker: `KXPRESNOMR-28-JDV`
- Polymarket YES token: `40081275558852222228080198821361202017557872256707631666334039001378518619916`
- Polymarket NO token: `78633590736077251574794513664747155551297291244492840448622550955320930591622`

This is an exact semantic match — identical question on both platforms. Both have deep, tight orderbooks (0.1c spreads, 100+ levels each).

## Tech Stack

- **Framework:** Next.js 16 (handles both frontend and backend)
- **Language:** TypeScript throughout
- **Styling:** TailwindCSS v4
- **WebSocket:** Native `ws` library server-side, native browser WebSocket client-side
- **Structure:** Single Next.js app with API routes for the WebSocket relay and quote engine

### Directory Structure

```
pm-aggr/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Main page
│   │   └── api/
│   │       └── quote/
│   │           └── route.ts    # REST endpoint for quote calculation
│   ├── components/
│   │   ├── OrderBook.tsx       # Order book display
│   │   ├── QuotePanel.tsx      # Dollar input + quote result
│   │   └── StatusBanner.tsx    # Connection status indicators
│   ├── hooks/
│   │   └── useOrderBook.ts    # WebSocket connection + state management
│   ├── lib/
│   │   ├── types.ts            # Shared TypeScript types
│   │   ├── normalize.ts        # Venue data normalization
│   │   ├── quote.ts            # Quote calculation logic
│   │   └── merge.ts            # Order book merging logic
│   └── server/
│       ├── ws-relay.ts         # WebSocket relay server (custom server)
│       ├── connectors/
│       │   ├── types.ts        # Connector interface
│       │   ├── dflow.ts        # DFlow connector (Kalshi data)
│       │   └── polymarket.ts   # Polymarket CLOB connector
│       └── book-manager.ts     # Manages per-market normalized books
├── public/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── server.ts                   # Custom server entry (for WS support)
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js React App)                             │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │ OrderBook   │  │ QuotePanel │  │ StatusBanner     │  │
│  │ Component   │  │ Component  │  │ Component        │  │
│  └──────┬──────┘  └──────┬─────┘  └────────┬─────────┘  │
│         │               │                  │             │
│  ┌──────┴───────────────┴──────────────────┴──────────┐ │
│  │              useOrderBook() hook                    │ │
│  │  - Maintains single WS to backend relay             │ │
│  │  - Reconnects with exponential backoff              │ │
│  │  - Stores normalized book state                     │ │
│  └─────────────────────┬──────────────────────────────┘ │
└────────────────────────┼────────────────────────────────┘
                         │ Single WebSocket (ws://localhost:3001)
┌────────────────────────┼────────────────────────────────┐
│  Backend (Custom Next.js Server)                         │
│                                                          │
│  ┌─────────────────────┴──────────────────────────────┐ │
│  │              WebSocket Relay (ws-relay.ts)           │ │
│  │  - Accepts browser clients on /ws                   │ │
│  │  - Broadcasts merged + normalized book snapshots    │ │
│  │  - Throttles broadcasts to max 5/sec               │ │
│  └──────────┬──────────────────────┬──────────────────┘ │
│             │                      │                     │
│  ┌──────────┴──────────┐ ┌────────┴───────────────┐    │
│  │  DFlow Connector    │ │  Polymarket Connector   │    │
│  │  (Kalshi data)      │ │  (Direct CLOB WS)      │    │
│  │                     │ │                         │    │
│  │  WS endpoint:       │ │  WS endpoint:           │    │
│  │  wss://dev-         │ │  wss://ws-subscriptions │    │
│  │  prediction-markets │ │  -clob.polymarket.com   │    │
│  │  -api.dflow.net     │ │  /ws/market             │    │
│  │  /api/v1/ws         │ │                         │    │
│  │                     │ │  REST fallback:          │    │
│  │  REST fallback:     │ │  https://clob.poly      │    │
│  │  https://dev-       │ │  market.com/book        │    │
│  │  prediction-markets │ │  ?token_id=...          │    │
│  │  -api.dflow.net     │ │                         │    │
│  │  /api/v1/orderbook  │ │  Subscribe:             │    │
│  │  /KXPRESNOMR-28-JDV │ │  {assets_ids: [token],  │    │
│  │                     │ │   type: "market",       │    │
│  │  Subscribe:         │ │   custom_feature_       │    │
│  │  {type: "subscribe",│ │   enabled: true}        │    │
│  │   channel:          │ │                         │    │
│  │   "orderbook",      │ │  Events: book,          │    │
│  │   tickers:          │ │  price_change           │    │
│  │   ["KXPRESNOMR..."]}│ │                         │    │
│  └─────────────────────┘ └─────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Quote Engine (api/quote/route.ts)                │   │
│  │  - POST {amount, side}                            │   │
│  │  - Walks merged ask book greedily                 │   │
│  │  - Returns: shares, venue breakdown, avg price    │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## Data Normalization

### Shared Types

```typescript
type Venue = 'kalshi' | 'polymarket';
type Side = 'yes' | 'no';

interface PriceLevel {
  price: number;       // 0-1 range (e.g., 0.42 = 42 cents)
  size: number;        // number of contracts/shares
  venue: Venue;
}

interface OrderBook {
  bids: PriceLevel[];  // sorted descending by price (best bid first)
  asks: PriceLevel[];  // sorted ascending by price (best ask first)
}

interface NormalizedBook {
  yes: OrderBook;
  no: OrderBook;
  venueStatus: Record<Venue, 'connected' | 'reconnecting' | 'disconnected'>;
  timestamp: number;   // ms since epoch
}

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
```

### DFlow (Kalshi) Normalization

DFlow returns `yes_bids` and `no_bids` as `{price_string: quantity_string}` maps.

Reconstruction rules:
- `yes_bids` at price P, size S → **YES bid** at P with size S
- `no_bids` at price P, size S → **YES ask** at (1-P) with size S
- `no_bids` at price P, size S → **NO bid** at P with size S
- `yes_bids` at price P, size S → **NO ask** at (1-P) with size S

This gives us a full two-sided book for both YES and NO from one-sided data. Verified: the reconstructed book has a positive spread (no crossed book).

### Polymarket Normalization

Polymarket CLOB returns `bids` and `asks` arrays with `{price, size}` objects for each token.

For the YES token:
- `bids` → **YES bids** directly
- `asks` → **YES asks** directly

For deriving the NO book from the YES token:
- YES bid at P → **NO ask** at (1-P) with same size
- YES ask at P → **NO bid** at (1-P) with same size

We subscribe to the YES token only and derive the NO book from it.

### Merging

The merged book combines levels from both venues. At each price level, if both venues have orders at the same price, they appear as separate entries (preserving venue attribution). The merged book is sorted by price (bids descending, asks ascending).

## WebSocket Protocol (Backend → Browser)

The backend relay sends JSON messages to the browser:

### Snapshot message (sent on connect + periodically)
```json
{
  "type": "snapshot",
  "data": {
    "yes": {
      "bids": [{"price": 0.372, "size": 1689, "venue": "kalshi"}, ...],
      "asks": [{"price": 0.367, "size": 25, "venue": "polymarket"}, ...]
    },
    "no": {
      "bids": [...],
      "asks": [...]
    },
    "venueStatus": {
      "kalshi": "connected",
      "polymarket": "connected"
    },
    "timestamp": 1711929600000
  }
}
```

### Status message (sent when venue connection changes)
```json
{
  "type": "status",
  "data": {
    "venue": "kalshi",
    "status": "reconnecting"
  }
}
```

## Venue Connectors

### Interface

```typescript
interface VenueConnector {
  connect(): void;
  disconnect(): void;
  onBookUpdate(cb: (book: { yes: OrderBook; no: OrderBook }) => void): void;
  onStatusChange(cb: (status: ConnectionStatus) => void): void;
  getStatus(): ConnectionStatus;
}
```

### Reconnection Strategy

Both connectors use identical reconnection logic:
1. On disconnect: wait `delay` ms, then reconnect
2. Delay starts at 1000ms, doubles each attempt, caps at 30000ms
3. Add random jitter of 0-500ms to prevent thundering herd
4. On successful reconnect: fetch full snapshot via REST fallback, then resume WS
5. Reset delay to 1000ms on successful reconnect

### DFlow Connector

- Connect to `wss://dev-prediction-markets-api.dflow.net/api/v1/ws`
- Subscribe: `{"type": "subscribe", "channel": "orderbook", "tickers": ["KXPRESNOMR-28-JDV"]}`
- On message: parse `yes_bids`/`no_bids`, normalize, emit book update
- REST fallback: `GET https://dev-prediction-markets-api.dflow.net/api/v1/orderbook/KXPRESNOMR-28-JDV`

### Polymarket Connector

- Connect to `wss://ws-subscriptions-clob.polymarket.com/ws/market`
- Subscribe: `{"assets_ids": ["<YES_TOKEN>"], "type": "market", "custom_feature_enabled": true}`
- On `book` event: full snapshot — parse bids/asks, normalize, emit
- On `price_change` event: incremental update — update individual levels (size "0" = remove level)
- REST fallback: `GET https://clob.polymarket.com/book?token_id=<YES_TOKEN>`

## Quote Engine

### Input
```typescript
interface QuoteRequest {
  amount: number;   // dollar amount to spend
  side: 'yes' | 'no';  // which outcome to buy
}
```

### Algorithm

1. Get the merged **asks** for the requested side (buying YES means taking YES asks)
2. Walk the asks from cheapest to most expensive
3. For each level:
   - Calculate how many shares the remaining budget can buy at this price: `shares = budget / price`
   - If `shares >= level.size`: consume the entire level, reduce budget by `level.size * price`
   - If `shares < level.size`: partially fill, set remaining budget to 0
   - Record the fill: venue, price, quantity, cost
4. Stop when budget is exhausted or no more levels

### Output
```typescript
interface QuoteResult {
  totalShares: number;           // total shares received
  totalCost: number;             // should equal input amount (or less if book exhausted)
  avgPrice: number;              // weighted average price per share
  fills: {
    venue: Venue;
    price: number;
    shares: number;
    cost: number;
  }[];
  venueBreakdown: {
    kalshi: { shares: number; cost: number };
    polymarket: { shares: number; cost: number };
  };
  bookExhausted: boolean;        // true if order couldn't be fully filled
}
```

The quote is calculated via a REST endpoint (`POST /api/quote`). The custom server exposes the book-manager's latest merged book as a module-level singleton, accessible from both the relay and the API route handler since they run in the same Node.js process.

## Frontend Components

### Page Layout

Single-page layout with three main sections:

```
┌──────────────────────────────────────────────────────┐
│  Connection Status Banner                             │
│  [Kalshi: ● Connected]  [Polymarket: ● Connected]    │
├──────────────────────────────────────────────────────┤
│  Market Header                                        │
│  "Will JD Vance win the 2028 Republican nomination?"  │
│  Kalshi mid: 37.25¢ | Polymarket mid: 36.65¢         │
├──────────────────────┬───────────────────────────────┤
│                      │                                │
│  Order Book          │  Quote Panel                   │
│                      │                                │
│  BIDS    │  ASKS     │  Amount: [$ ___________]       │
│  ────────┼────────── │  Side:   [YES] [NO]            │
│  0.372 K │ 0.367 P   │                                │
│  0.370 K │ 0.368 P   │  ─── Quote Result ───          │
│  0.366 P │ 0.369 P   │  Shares: 1,234                 │
│  0.365 P │ 0.370 P   │  Avg Price: 36.8¢              │
│  0.364 P │ 0.371 P   │  From Kalshi: 456 ($168)       │
│  0.363 P │ 0.373 K   │  From Polymarket: 778 ($286)   │
│  ...     │ ...       │                                │
│                      │                                │
│  K = Kalshi (blue)   │                                │
│  P = Polymarket      │                                │
│    (purple)          │                                │
└──────────────────────┴───────────────────────────────┘
```

### OrderBook Component

- Two-column display: bids (left, green) and asks (right, red)
- Each row shows: price, size, venue indicator (color-coded)
- Color coding: Kalshi = blue, Polymarket = purple
- Size bars: horizontal bar proportional to level size
- Updates in real-time as WebSocket data arrives
- Truncated to top 15 levels per side for readability
- **Venue filter toggle:** three buttons — "Combined" (default), "Kalshi", "Polymarket" — above the order book. When a single venue is selected, only that venue's levels are shown. This lets users compare how each venue's book differs from the combined view.

### QuotePanel Component

- Dollar amount input field
- YES/NO toggle buttons
- Live quote result that updates as the book changes or amount changes
- Debounced: recalculates 300ms after user stops typing
- Shows: total shares, weighted average price, per-venue breakdown
- Warning if book would be exhausted

### StatusBanner Component

- Shows connection status for each venue
- Green dot = connected, yellow dot = reconnecting, red dot = disconnected
- Stale data warning if no update received in 30 seconds
- Collapses to a thin bar when all connected

## Long-Running Behavior

- Backend venue connectors reconnect independently with exponential backoff
- Browser-to-backend WebSocket reconnects with exponential backoff (1s→30s)
- No unbounded data accumulation — only the latest book snapshot is stored in memory
- Stale data detection: if no venue update in 30s, mark as potentially stale in the UI
- If one venue disconnects, the other's data continues to display with a degradation notice

## Error Handling

- Network errors: caught and trigger reconnection, logged to console
- Malformed venue data: caught, logged, skipped (don't crash)
- REST fallback: on initial connect or after reconnect, fetch full snapshot via REST before relying on WS deltas
- Quote with empty book: return zero shares with `bookExhausted: true`

## What This Project Does NOT Do

- No user authentication
- No order placement (read-only)
- No historical data storage
- No multiple markets (single hardcoded market)
- No mobile-specific layout (responsive but desktop-primary)
