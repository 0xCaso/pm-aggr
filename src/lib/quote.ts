import type { OrderBook, PriceLevel, QuoteFill, QuoteResult, Venue } from './types';

/**
 * Calculate a quote for buying shares from the aggregated order book.
 * 
 * Key optimization: minimize venue fragmentation. When multiple venues offer
 * the same price, prefer to continue filling from the venue we've already been
 * using. This reduces execution complexity (fewer venues = simpler execution).
 * 
 * Algorithm:
 * 1. Group asks by price level (rounded to 0.1 cent / 0.001)
 * 2. At each price level, if we have a "primary" venue (one we've filled most from),
 *    exhaust that venue's liquidity first before using others at the same price
 * 3. Only switch venues when the other venue has a BETTER price
 */
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

  // Round to 0.1 cent (0.001) to properly group prices like 0.371 and 0.3710001
  const roundPrice = (p: number): number => Math.round(p * 1000) / 1000;

  // Group asks by price level, preserving venue info
  const asksByPrice = new Map<number, PriceLevel[]>();
  for (const level of sideBook.asks) {
    // Skip zero-size levels
    if (level.size <= 0) continue;
    
    const roundedPrice = roundPrice(level.price);
    if (!asksByPrice.has(roundedPrice)) {
      asksByPrice.set(roundedPrice, []);
    }
    asksByPrice.get(roundedPrice)!.push(level);
  }

  // Sort prices ascending (best prices first)
  const sortedPrices = [...asksByPrice.keys()].sort((a, b) => a - b);

  // Track which venue we've filled the most from (primary venue)
  const getPrimaryVenue = (): Venue | null => {
    const polyShares = venueBreakdown.polymarket.shares;
    const kalshiShares = venueBreakdown.kalshi.shares;
    if (polyShares === 0 && kalshiShares === 0) return null;
    return polyShares >= kalshiShares ? 'polymarket' : 'kalshi';
  };

  for (const price of sortedPrices) {
    if (budget <= 0) break;

    const levelsAtPrice = asksByPrice.get(price)!;
    const primaryVenue = getPrimaryVenue();

    // Sort levels: primary venue first, then others
    const sortedLevels = [...levelsAtPrice].sort((a, b) => {
      if (primaryVenue === null) {
        // No primary yet - prefer Polymarket (arbitrary but consistent)
        if (a.venue === 'polymarket' && b.venue !== 'polymarket') return -1;
        if (b.venue === 'polymarket' && a.venue !== 'polymarket') return 1;
        return 0;
      }
      // Primary venue comes first
      if (a.venue === primaryVenue && b.venue !== primaryVenue) return -1;
      if (b.venue === primaryVenue && a.venue !== primaryVenue) return 1;
      return 0;
    });

    // Fill from sorted levels at this price
    for (const level of sortedLevels) {
      if (budget <= 0) break;

      const maxSharesAtPrice = budget / level.price;
      const sharesToFill = Math.min(maxSharesAtPrice, level.size);
      const cost = sharesToFill * level.price;

      if (sharesToFill > 0) {
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
    }
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
