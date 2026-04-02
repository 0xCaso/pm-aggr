import WebSocket from 'ws';
import { normalizeDFlow } from '@/lib/normalize';
import type { DFlowRawBook } from '@/lib/normalize';
import type { ConnectionStatus, OrderBook } from '@/lib/types';
import { MARKET } from '@/lib/types';
import type { VenueConnector } from './types';

const WS_URL = 'wss://dev-prediction-markets-api.dflow.net/api/v1/ws';
const REST_URL = `https://dev-prediction-markets-api.dflow.net/api/v1/orderbook/${MARKET.kalshiTicker}`;

export class DFlowConnector implements VenueConnector {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private bookCb: ((book: { yes: OrderBook; no: OrderBook }) => void) | null = null;
  private statusCb: ((status: ConnectionStatus) => void) | null = null;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect(): void {
    this.shouldReconnect = true;
    this.doConnect(true); // true = initial connect, fetch REST snapshot
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

  private async fetchRestSnapshot(): Promise<void> {
    try {
      const resp = await fetch(REST_URL);
      if (resp.ok) {
        const data = await resp.json();
        const raw: DFlowRawBook = {
          yes_bids: data.yes_bids ?? {},
          no_bids: data.no_bids ?? {},
        };
        const book = normalizeDFlow(raw);
        this.bookCb?.(book);
        console.log('[DFlow] REST snapshot loaded');
      } else {
        console.error('[DFlow] REST snapshot failed:', resp.status);
      }
    } catch (err) {
      console.error('[DFlow] REST snapshot error:', err);
    }
  }

  private async doConnect(fetchSnapshot: boolean = false): Promise<void> {
    // Fetch REST snapshot first to ensure we have initial data
    if (fetchSnapshot) {
      await this.fetchRestSnapshot();
    }

    try {
      this.ws = new WebSocket(WS_URL);
    } catch (err) {
      console.error('[DFlow] WebSocket constructor error:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.on('open', () => {
      console.log('[DFlow] WebSocket connected');
      this.setStatus('connected');
      this.reconnectDelay = 1000;

      this.ws?.send(
        JSON.stringify({
          type: 'subscribe',
          channel: 'orderbook',
          tickers: [MARKET.kalshiTicker],
        }),
      );
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.yes_bids !== undefined || msg.no_bids !== undefined) {
          const raw: DFlowRawBook = {
            yes_bids: msg.yes_bids ?? {},
            no_bids: msg.no_bids ?? {},
          };
          const book = normalizeDFlow(raw);
          this.bookCb?.(book);
        }
      } catch (err) {
        console.error('[DFlow] Failed to parse message:', err);
      }
    });

    this.ws.on('close', () => {
      console.log('[DFlow] WebSocket closed');
      this.ws = null;
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      console.error('[DFlow] WebSocket error:', err);
      this.ws?.close();
    });
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;
    this.setStatus('reconnecting');

    const jitter = Math.random() * 500;
    const delay = this.reconnectDelay + jitter;
    console.log(`[DFlow] Reconnecting in ${Math.round(delay)}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.doConnect(true); // Fetch snapshot on reconnect too
    }, delay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }
}
