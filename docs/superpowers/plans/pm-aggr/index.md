# Prediction Market Aggregator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time prediction market order book aggregator combining Polymarket and Kalshi (via DFlow) into a unified view with a quote calculator.

**Architecture:** Custom Next.js server with a WebSocket relay connecting upstream to DFlow and Polymarket, normalizing data, merging books, and broadcasting snapshots to browser clients. Single-page React frontend with order book, venue filter, quote panel, and connection status.

**Tech Stack:** Next.js 16.2.2, TypeScript 6, TailwindCSS v4.2, `ws` 8.20 for server-side WebSocket, native browser WebSocket, Vitest 4.1 for tests.

**Spec:** `docs/superpowers/specs/2026-04-01-prediction-market-aggregator-design.md`

---

## File Structure

```
pm-aggr/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with dark theme, metadata
│   │   ├── page.tsx            # Main page wiring all components
│   │   ├── globals.css         # TailwindCSS v4 import
│   │   └── api/quote/
│   │       └── route.ts        # POST endpoint for quote calculation
│   ├── components/
│   │   ├── OrderBook.tsx       # Bids/asks columns with venue colors, filter, size bars
│   │   ├── QuotePanel.tsx      # Dollar input + YES/NO toggle + quote result
│   │   ├── StatusBanner.tsx    # Connection status dots per venue
│   │   └── MarketHeader.tsx    # Market title + per-venue mid prices
│   ├── hooks/
│   │   └── useOrderBook.ts     # Browser WS connection, state, reconnect, stale detection
│   ├── lib/
│   │   ├── types.ts            # All shared TypeScript types + market config constant
│   │   ├── normalize.ts        # DFlow and Polymarket raw data → NormalizedBook
│   │   ├── quote.ts            # Greedy walk quote calculation
│   │   └── merge.ts            # Merge two OrderBooks preserving venue attribution
│   └── server/
│       ├── ws-relay.ts         # WebSocketServer on /ws, throttled broadcast
│       ├── book-manager.ts     # Stores per-venue books, merges, fires onChange
│       ├── shared.ts           # Module-level BookManager singleton accessor
│       └── connectors/
│           ├── types.ts        # VenueConnector interface
│           ├── dflow.ts        # DFlow WS connector (Kalshi data)
│           └── polymarket.ts   # Polymarket CLOB WS connector
├── tests/
│   ├── lib/
│   │   ├── normalize.test.ts
│   │   ├── merge.test.ts
│   │   └── quote.test.ts
│   └── server/
│       └── book-manager.test.ts
├── server.ts                   # Custom server entry (HTTP + Next + WS relay)
├── vitest.config.ts
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── .gitignore
└── package.json
```

---

## Task Index

Dependencies are listed per task. Independent tasks can run in parallel.

| # | Task | Dependencies | File |
|---|------|-------------|------|
| 1 | [Project Scaffolding](./task-01.md) | none | Config files, layout, placeholder page |
| 2 | [Shared Types](./task-02.md) | Task 1 | `src/lib/types.ts` |
| 3 | [Normalization Logic (TDD)](./task-03.md) | Task 2 | `src/lib/normalize.ts`, tests |
| 4 | [Merge Logic (TDD)](./task-04.md) | Task 2 | `src/lib/merge.ts`, tests |
| 5 | [Quote Engine (TDD)](./task-05.md) | Task 2 | `src/lib/quote.ts`, tests |
| 6 | [Connector Interface + DFlow](./task-06.md) | Tasks 2, 3 | `src/server/connectors/` |
| 7 | [Polymarket Connector](./task-07.md) | Tasks 2, 3 | `src/server/connectors/polymarket.ts` |
| 8 | [Book Manager (TDD)](./task-08.md) | Tasks 2, 4 | `src/server/book-manager.ts`, tests |
| 9 | [WebSocket Relay](./task-09.md) | Tasks 2, 8 | `src/server/ws-relay.ts` |
| 10 | [Custom Server + Shared Singleton](./task-10.md) | Tasks 6, 7, 8, 9 | `server.ts`, `src/server/shared.ts` |
| 11 | [Quote API Route](./task-11.md) | Tasks 5, 10 | `src/app/api/quote/route.ts` |
| 12 | [useOrderBook Hook](./task-12.md) | Task 2 | `src/hooks/useOrderBook.ts` |
| 13 | [StatusBanner Component](./task-13.md) | Task 12 | `src/components/StatusBanner.tsx` |
| 14 | [MarketHeader Component](./task-14.md) | Task 12 | `src/components/MarketHeader.tsx` |
| 15 | [OrderBook Component](./task-15.md) | Task 12 | `src/components/OrderBook.tsx` |
| 16 | [QuotePanel Component](./task-16.md) | Task 12 | `src/components/QuotePanel.tsx` |
| 17 | [Main Page Assembly](./task-17.md) | Tasks 13-16 | `src/app/page.tsx` |
| 18 | [Integration Verification](./task-18.md) | All | Smoke tests |
