import type { OrderBook, QuoteFill, QuoteResult, Venue } from './types';

export function calculateQuote(
  sideBook: OrderBook,
  amount: number,
): QuoteResult {
  const fills: QuoteFill[] = [];
  const venueBreakdown: Record<Venue, { shares: number; cost: number }> = {
    kalshi: { shares: 0, cost: 0 },
    polymarket: { shares: 0, cost: 0 },
  };

  let budget = amount;
  let totalShares = 0;
  let totalCost = 0;

  for (const level of sideBook.asks) {
    if (budget <= 0) break;

    const maxSharesAtPrice = budget / level.price;
    const sharesToFill = Math.min(maxSharesAtPrice, level.size);
    const cost = sharesToFill * level.price;

    fills.push({
      venue: level.venue,
      price: level.price,
      shares: sharesToFill,
      cost,
    });

    venueBreakdown[level.venue].shares += sharesToFill;
    venueBreakdown[level.venue].cost += cost;

    totalShares += sharesToFill;
    totalCost += cost;
    budget -= cost;
  }

  const bookExhausted =
    budget > 0 && amount > 0 && totalCost < amount;

  return {
    totalShares,
    totalCost,
    avgPrice: totalShares > 0 ? totalCost / totalShares : 0,
    fills,
    venueBreakdown,
    bookExhausted,
  };
}
