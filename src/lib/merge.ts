import type { OrderBook, PriceLevel } from './types';

function mergeSorted(
  a: PriceLevel[],
  b: PriceLevel[],
  comparator: (x: PriceLevel, y: PriceLevel) => number,
): PriceLevel[] {
  const result: PriceLevel[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (comparator(a[i], b[j]) <= 0) {
      result.push(a[i]);
      i++;
    } else {
      result.push(b[j]);
      j++;
    }
  }

  while (i < a.length) {
    result.push(a[i]);
    i++;
  }
  while (j < b.length) {
    result.push(b[j]);
    j++;
  }

  return result;
}

export function mergeBooks(a: OrderBook, b: OrderBook): OrderBook {
  return {
    // Bids: descending by price (higher first)
    bids: mergeSorted(a.bids, b.bids, (x, y) => y.price - x.price),
    // Asks: ascending by price (lower first)
    asks: mergeSorted(a.asks, b.asks, (x, y) => x.price - y.price),
  };
}
