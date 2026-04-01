import WebSocket from 'ws';
import { normalizePolymarket } from '@/lib/normalize';
import type { PolymarketRawBook } from '@/lib/normalize';
import type { ConnectionStatus, OrderBook } from '@/lib/types';
import { MARKET } from '@/lib/types';
import type { VenueConnector } from './types';

const WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const REST_URL = `https://clob.polymarket.com/book?token_id=${MARKET.polymarketYesToken}`;

export class PolymarketConnector implements VenueConnector {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private bookCb: ((book: { yes: OrderBook; no: OrderBook }) => void) | null = null;
  private statusCb: ((status: ConnectionStatus) => void) | null = null;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  // Internal state for incremental updates
  private bidsMap = new Map<string, { price: string; size: string }>();
  private asksMap = new Map<string, { price: string; size: string }>();

  connect(): void {
    this.shouldReconnect = true;
    this.doConnect();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  onBookUpdate(cb: (book: { yes: OrderBook; no: OrderBook }) => void): void {
    this.bookCb = cb;
  }

  onStatusChange(cb: (status: ConnectionStatus) => void): void {
    this.statusCb = cb;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(s: ConnectionStatus): void {
    if (this.status !== s) {
      this.status = s;
      this.statusCb?.(s);
    }
  }

  private emitCurrentBook(): void {
    const raw: PolymarketRawBook = {
      bids: Array.from(this.bidsMap.values()),
      asks: Array.from(this.asksMap.values()),
    };
    const book = normalizePolymarket(raw);
    this.bookCb?.(book);
  }

  private handleBookSnapshot(data: {
    bids: { price: string; size: string }[];
    asks: { price: string; size: string }[];
  }): void {
    this.bidsMap.clear();
    this.asksMap.clear();

    for (const level of data.bids) {
      this.bidsMap.set(level.price, level);
    }
    for (const level of data.asks) {
      this.asksMap.set(level.price, level);
    }

    this.emitCurrentBook();
  }

  private handlePriceChange(changes: {
    side: 'BUY' | 'SELL';
    price: string;
    size: string;
  }[]): void {
    for (const change of changes) {
      const map = change.side === 'BUY' ? this.bidsMap : this.asksMap;

      if (change.size === '0' || Number(change.size) === 0) {
        map.delete(change.price);
      } else {
        map.set(change.price, { price: change.price, size: change.size });
      }
    }

    this.emitCurrentBook();
  }

  private doConnect(): void {
    try {
      this.ws = new WebSocket(WS_URL);
    } catch (err) {
      console.error('[Polymarket] WebSocket constructor error:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log('[Polymarket] WebSocket connected');
      this.setStatus('connected');
      this.reconnectDelay = 1000;

      this.ws?.send(
        JSON.stringify({
          assets_ids: [MARKET.polymarketYesToken],
          type: 'market',
          custom_feature_enabled: true,
        }),
      );
    });

    this.ws.on('message', (data) => {
      try {
        const msgs = JSON.parse(data.toString());
        // Polymarket sends arrays of events
        const events = Array.isArray(msgs) ? msgs : [msgs];

        for (const msg of events) {
          if (msg.event_type === 'book') {
            this.handleBookSnapshot(msg);
          } else if (msg.event_type === 'price_change') {
            const changes = Array.isArray(msg.changes) ? msg.changes : [msg];
            this.handlePriceChange(changes);
          }
        }
      } catch (err) {
        console.error('[Polymarket] Failed to parse message:', err);
      }
    });

    this.ws.on('close', () => {
      console.log('[Polymarket] WebSocket closed');
      this.ws = null;
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[Polymarket] WebSocket error:', err);
      this.ws?.close();
    });
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    this.setStatus('reconnecting');

    const jitter = Math.random() * 500;
    const delay = this.reconnectDelay + jitter;
    console.log(`[Polymarket] Reconnecting in ${Math.round(delay)}ms`);

    this.reconnectTimer = setTimeout(async () => {
      // Fetch REST snapshot first on reconnect
      try {
        const resp = await fetch(REST_URL);
        if (resp.ok) {
          const data = await resp.json();
          if (data.bids && data.asks) {
            this.handleBookSnapshot(data);
          }
        }
      } catch (err) {
        console.error('[Polymarket] REST fallback failed:', err);
      }

      this.doConnect();
    }, delay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }
}
