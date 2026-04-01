import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { BookManager } from './book-manager';
import type { NormalizedBook, WSMessage } from '@/lib/types';

export function createRelay(server: Server, bookManager: BookManager): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  let lastBroadcast = 0;
  let pendingBroadcast: ReturnType<typeof setTimeout> | null = null;

  function broadcast(msg: WSMessage): void {
    const payload = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  function broadcastSnapshot(book: NormalizedBook): void {
    const msg: WSMessage = { type: 'snapshot', data: book };
    broadcast(msg);
    lastBroadcast = Date.now();
  }

  function throttledBroadcast(book: NormalizedBook): void {
    if (pendingBroadcast) {
      clearTimeout(pendingBroadcast);
    }

    const elapsed = Date.now() - lastBroadcast;
    const minInterval = 200; // 5/sec max

    if (elapsed >= minInterval) {
      broadcastSnapshot(book);
    } else {
      pendingBroadcast = setTimeout(() => {
        pendingBroadcast = null;
        broadcastSnapshot(bookManager.getMergedBook());
      }, minInterval - elapsed);
    }
  }

  // Wire up BookManager onChange -> throttled broadcast
  bookManager.onChange((book) => {
    throttledBroadcast(book);
  });

  // Send snapshot to new clients immediately
  wss.on('connection', (ws) => {
    console.log('[Relay] Client connected');
    const snapshot: WSMessage = {
      type: 'snapshot',
      data: bookManager.getMergedBook(),
    };
    ws.send(JSON.stringify(snapshot));

    ws.on('close', () => {
      console.log('[Relay] Client disconnected');
    });
  });

  console.log('[Relay] WebSocket server listening on /ws');
}
