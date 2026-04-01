# Prediction Market Aggregator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time prediction market order book aggregator combining Polymarket and Kalshi (via DFlow) into a unified view with a quote calculator.

**Architecture:** Custom Next.js server with a WebSocket relay connecting upstream to DFlow and Polymarket, normalizing data, merging books, and broadcasting snapshots to browser clients. Single-page React frontend with order book, venue filter, quote panel, and connection status.

**Tech Stack:** Next.js 16, TypeScript, TailwindCSS v4, `ws` for server-side WebSocket, native browser WebSocket.

**Spec:** `docs/superpowers/specs/2026-04-01-prediction-market-aggregator-design.md`

---

## File Structure

```
pm-aggr/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── api/quote/route.ts
│   ├── components/
│   │   ├── OrderBook.tsx
│   │   ├── QuotePanel.tsx
│   │   ├── StatusBanner.tsx
│   │   └── MarketHeader.tsx
│   ├── hooks/
│   │   └── useOrderBook.ts
│   ├── lib/
│   │   ├── types.ts
│   │   ├── normalize.ts
│   │   ├── quote.ts
│   │   └── merge.ts
│   └── server/
│       ├── ws-relay.ts
│       ├── book-manager.ts
│       ├── shared.ts
│       └── connectors/
│           ├── types.ts
│           ├── dflow.ts
│           └── polymarket.ts
├── server.ts
├── vitest.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

### Task 1: Project Scaffolding

**Files:** package.json, tsconfig.json, next.config.ts, tailwind.config.ts, globals.css, layout.tsx, page.tsx

- [ ] Step 1: `npm init -y && npm install next react react-dom ws && npm install -D typescript @types/node @types/react @types/react-dom @types/ws tailwindcss @tailwindcss/postcss vitest tsx`
- [ ] Step 2: Create tsconfig.json with bundler module resolution, `@/*` path alias
- [ ] Step 3: Create next.config.ts (empty config)
- [ ] Step 4: Create tailwind.config.ts, postcss.config.mjs with `@tailwindcss/postcss`
- [ ] Step 5: Create src/app/globals.css with `@import "tailwindcss"`
- [ ] Step 6: Create src/app/layout.tsx with dark bg, metadata
- [ ] Step 7: Create src/app/page.tsx placeholder
- [ ] Step 8: Create vitest.config.ts with `@` path alias
- [ ] Step 9: Create .gitignore (node_modules, .next, etc.)
- [ ] Step 10: Update package.json scripts: dev=`tsx server.ts`, test=`vitest run`
- [ ] Step 11: Verify `npx next build` succeeds
- [ ] Step 12: Commit

---

### Task 2: Shared Types

**Files:** src/lib/types.ts

- [ ] Step 1: Create types — Venue, Side, ConnectionStatus, PriceLevel, OrderBook, NormalizedBook, QuoteRequest, QuoteFill, QuoteResult, WSMessage types, MARKET config constant
- [ ] Step 2: Commit

---

### Task 3: Normalization Logic (TDD)

**Files:** src/lib/normalize.ts, tests/lib/normalize.test.ts

- [ ] Step 1: Write tests for normalizeDFlow — yes_bids→YES bids+NO asks, no_bids→NO bids+YES asks, both, empty
- [ ] Step 2: Write tests for normalizePolymarket — direct mapping + NO book derivation
- [ ] Step 3: Run tests, verify FAIL
- [ ] Step 4: Implement normalizeDFlow and normalizePolymarket
- [ ] Step 5: Run tests, verify PASS
- [ ] Step 6: Commit

---

### Task 4: Merge Logic (TDD)

**Files:** src/lib/merge.ts, tests/lib/merge.test.ts

- [ ] Step 1: Write tests for mergeBooks — sorted merge of bids/asks, empty books, venue attribution preserved
- [ ] Step 2: Run tests, verify FAIL
- [ ] Step 3: Implement mergeBooks with merge-sort approach
- [ ] Step 4: Run tests, verify PASS
- [ ] Step 5: Commit

---

### Task 5: Quote Engine (TDD)

**Files:** src/lib/quote.ts, tests/lib/quote.test.ts

- [ ] Step 1: Write tests — single level fill, multi-level multi-venue, book exhausted, empty book, zero budget, venue breakdown
- [ ] Step 2: Run tests, verify FAIL
- [ ] Step 3: Implement calculateQuote greedy walk
- [ ] Step 4: Run tests, verify PASS
- [ ] Step 5: Commit

---

### Task 6: Connector Interface + DFlow Connector

**Files:** src/server/connectors/types.ts, src/server/connectors/dflow.ts

- [ ] Step 1: Create VenueConnector interface (connect, disconnect, onBookUpdate, onStatusChange, getStatus)
- [ ] Step 2: Implement DFlowConnector — WS to dflow.net, subscribe to orderbook channel, REST fallback, exponential backoff reconnect
- [ ] Step 3: Commit

---

### Task 7: Polymarket Connector

**Files:** src/server/connectors/polymarket.ts

- [ ] Step 1: Implement PolymarketConnector — WS to polymarket CLOB, handle book+price_change events, incremental updates via Map, REST fallback, exponential backoff
- [ ] Step 2: Commit

---

### Task 8: Book Manager (TDD)

**Files:** src/server/book-manager.ts, tests/server/book-manager.test.ts

- [ ] Step 1: Write tests — starts empty, stores+merges venue books, updates venue status, fires onChange
- [ ] Step 2: Run tests, verify FAIL
- [ ] Step 3: Implement BookManager
- [ ] Step 4: Run tests, verify PASS
- [ ] Step 5: Commit

---

### Task 9: WebSocket Relay

**Files:** src/server/ws-relay.ts

- [ ] Step 1: Implement createRelay — WebSocketServer on /ws path, throttled broadcast (200ms), snapshot on connect, status change passthrough
- [ ] Step 2: Commit

---

### Task 10: Custom Server + Shared Singleton

**Files:** server.ts, src/server/shared.ts

- [ ] Step 1: Create shared.ts with get/setBookManager singleton accessor
- [ ] Step 2: Create server.ts — http server, next app handler, BookManager, WS relay, connect both venue connectors, wire callbacks, graceful shutdown
- [ ] Step 3: Commit

---

### Task 11: Quote API Route

**Files:** src/app/api/quote/route.ts

- [ ] Step 1: POST handler — parse amount+side, validate, get merged book from shared BookManager, run calculateQuote, return JSON
- [ ] Step 2: Commit

---

### Task 12: useOrderBook Hook

**Files:** src/hooks/useOrderBook.ts

- [ ] Step 1: Implement — browser WS to /ws, parse snapshot+status messages, exponential backoff reconnect, stale detection (30s), expose book/relayStatus/stale
- [ ] Step 2: Commit

---

### Task 13: StatusBanner Component

**Files:** src/components/StatusBanner.tsx

- [ ] Step 1: Implement — green/yellow/red dots for relay+kalshi+polymarket, stale warning, collapses when all connected
- [ ] Step 2: Commit

---

### Task 14: MarketHeader Component

**Files:** src/components/MarketHeader.tsx

- [ ] Step 1: Implement — market title, per-venue mid prices (filtered by venue), formatted as cents
- [ ] Step 2: Commit

---

### Task 15: OrderBook Component

**Files:** src/components/OrderBook.tsx

- [ ] Step 1: Implement — bids/asks columns, venue color coding (K=blue, P=purple), size bars, venue filter toggle (Combined/Kalshi/Polymarket), 15 levels max, legend
- [ ] Step 2: Commit

---

### Task 16: QuotePanel Component

**Files:** src/components/QuotePanel.tsx

- [ ] Step 1: Implement — dollar input, YES/NO toggle, debounced fetch (300ms) to /api/quote, display shares/avgPrice/cost/venue breakdown, book exhausted warning
- [ ] Step 2: Commit

---

### Task 17: Main Page Assembly

**Files:** src/app/page.tsx (modify)

- [ ] Step 1: Wire up — useOrderBook hook, StatusBanner, MarketHeader, YES/NO side selector for order book, OrderBook + QuotePanel in flex layout
- [ ] Step 2: Commit

---

### Task 18: Integration Verification

- [ ] Step 1: Run `npx vitest run` — all tests pass
- [ ] Step 2: Run `npx next build` — build succeeds
- [ ] Step 3: Run `npm run dev` — server starts, venue WS connections logged
- [ ] Step 4: Open browser — verify live order book + quote calculator
- [ ] Step 5: Verify WS relay in devtools Network tab
- [ ] Step 6: `curl -X POST localhost:3000/api/quote -H 'Content-Type: application/json' -d '{"amount":100,"side":"yes"}'` — returns valid quote
- [ ] Step 7: Final commit
