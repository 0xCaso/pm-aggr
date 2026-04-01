# Task 12: useOrderBook Hook

**Files:**
- Create: `src/hooks/useOrderBook.ts`

**Dependencies:** Task 2 (types)

**Context:** This React hook connects to the backend WebSocket relay at `/ws`, parses snapshot and status messages, manages reconnection with exponential backoff, and detects stale data (no update in 30s). It exposes the current `NormalizedBook`, the relay connection status, and whether data is stale.

---

- [ ] **Step 1: Create `src/hooks/useOrderBook.ts`**

```typescript
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  ConnectionStatus,
  NormalizedBook,
  Venue,
  WSMessage,
} from '@/lib/types';

const STALE_TIMEOUT = 30_000; // 30 seconds

interface UseOrderBookReturn {
  book: NormalizedBook | null;
  relayStatus: ConnectionStatus;
  isStale: boolean;
}

export function useOrderBook(): UseOrderBookReturn {
  const [book, setBook] = useState<NormalizedBook | null>(null);
  const [relayStatus, setRelayStatus] = useState<ConnectionStatus>('disconnected');
  const [isStale, setIsStale] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const resetStaleTimer = useCallback(() => {
    setIsStale(false);
    if (staleTimerRef.current) {
      clearTimeout(staleTimerRef.current);
    }
    staleTimerRef.current = setTimeout(() => {
      setIsStale(true);
    }, STALE_TIMEOUT);
  }, []);

  const connect = useCallback(() => {
    if (!shouldReconnectRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      setRelayStatus('connected');
      reconnectDelayRef.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        if (msg.type === 'snapshot') {
          setBook(msg.data);
          resetStaleTimer();
        } else if (msg.type === 'status') {
          setBook((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              venueStatus: {
                ...prev.venueStatus,
                [msg.data.venue]: msg.data.status,
              },
            };
          });
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };

    function scheduleReconnect() {
      if (!shouldReconnectRef.current) return;
      setRelayStatus('reconnecting');

      const jitter = Math.random() * 500;
      const delay = reconnectDelayRef.current + jitter;

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);

      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * 2,
        30_000,
      );
    }
  }, [resetStaleTimer]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { book, relayStatus, isStale };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useOrderBook.ts
git commit -m "feat: add useOrderBook hook with WS connection, reconnect, stale detection"
```
