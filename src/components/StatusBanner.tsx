'use client';

import type { ConnectionStatus, Venue } from '@/lib/types';

interface StatusBannerProps {
  relayStatus: ConnectionStatus;
  venueStatus: Record<Venue, ConnectionStatus> | undefined;
  isStale: boolean;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  reconnecting: 'bg-yellow-500',
  disconnected: 'bg-red-500',
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  reconnecting: 'Reconnecting...',
  disconnected: 'Disconnected',
};

function StatusDot({ status, label }: { status: ConnectionStatus; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[status]}`} />
      <span className="text-gray-400">{label}:</span>
      <span className="text-gray-300">{STATUS_LABELS[status]}</span>
    </div>
  );
}

export function StatusBanner({ relayStatus, venueStatus, isStale }: StatusBannerProps) {
  const allConnected =
    relayStatus === 'connected' &&
    venueStatus?.kalshi === 'connected' &&
    venueStatus?.polymarket === 'connected' &&
    !isStale;

  return (
    <div
      className={`border-b border-gray-800 transition-all ${
        allConnected ? 'py-1 px-4' : 'py-2 px-4'
      }`}
    >
      <div className="flex items-center gap-4 flex-wrap">
        <StatusDot status={relayStatus} label="Relay" />
        {venueStatus && (
          <>
            <StatusDot status={venueStatus.kalshi} label="Kalshi" />
            <StatusDot status={venueStatus.polymarket} label="Polymarket" />
          </>
        )}
        {isStale && (
          <span className="text-yellow-400 text-sm font-medium ml-auto">
            ⚠ Data may be stale (no update for 30s)
          </span>
        )}
      </div>
    </div>
  );
}
