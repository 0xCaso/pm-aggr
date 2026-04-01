import { NextRequest, NextResponse } from 'next/server';
import { calculateQuote } from '@/lib/quote';
import { getBookManager } from '@/server/shared';
import type { Side } from '@/lib/types';

export async function POST(request: NextRequest) {
  let body: { amount?: unknown; side?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { amount, side } = body;

  // Validate amount
  if (typeof amount !== 'number' || !isFinite(amount) || amount < 0) {
    return NextResponse.json(
      { error: 'amount must be a non-negative number' },
      { status: 400 },
    );
  }

  // Validate side
  if (side !== 'yes' && side !== 'no') {
    return NextResponse.json(
      { error: 'side must be "yes" or "no"' },
      { status: 400 },
    );
  }

  const validSide: Side = side;

  try {
    const bookManager = getBookManager();
    const merged = bookManager.getMergedBook();
    const sideBook = merged[validSide];
    const result = calculateQuote(sideBook, amount);

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Quote API] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
