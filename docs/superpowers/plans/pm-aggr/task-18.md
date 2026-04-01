# Task 18: Integration Verification

**Files:** None (verification only)

**Dependencies:** All previous tasks

**Context:** Final smoke test to verify everything works end-to-end: tests pass, build succeeds, server starts, live data flows, quote API responds.

---

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`

Expected: All tests pass (normalize: 9, merge: 6, quote: 6, book-manager: 7 = 28 total).

- [ ] **Step 2: Run production build**

Run: `npx next build`

Expected: Build completes with no errors. Routes listed include `/` and `/api/quote`.

- [ ] **Step 3: Start dev server**

Run: `npm run dev`

Expected output includes:
```
> Server listening on http://localhost:3000
> WebSocket relay on ws://localhost:3000/ws
[DFlow] WebSocket connected
[Polymarket] WebSocket connected
```

Both venues should connect (or show reconnecting if network issues).

- [ ] **Step 4: Verify browser loads**

Open `http://localhost:3000` in browser.

Expected:
- Status banner shows connection dots
- Market title displays
- Order book populates with real-time price levels
- Kalshi levels in blue, Polymarket in purple
- Venue filter buttons work (Combined/Kalshi/Polymarket)

- [ ] **Step 5: Verify WebSocket in browser devtools**

Open Network tab → WS filter → find `/ws` connection.

Expected: Messages flowing with `{"type":"snapshot","data":{...}}` payloads at ~5/sec max.

- [ ] **Step 6: Test quote API**

Run:

```bash
curl -s -X POST http://localhost:3000/api/quote \
  -H 'Content-Type: application/json' \
  -d '{"amount": 100, "side": "yes"}' | python3 -m json.tool
```

Expected: JSON response with `totalShares`, `totalCost`, `avgPrice`, `fills`, `venueBreakdown`, and `bookExhausted` fields. `totalCost` should be close to 100 (unless book is thin).

- [ ] **Step 7: Test quote panel in browser**

In the browser:
1. Enter `100` in the dollar input
2. Toggle YES/NO — quote result updates
3. Result shows shares, avg price, venue breakdown
4. If book is thin, yellow "book exhausted" warning appears

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: integration verification complete"
```
