'use client';

import Image from 'next/image';
import type { ConnectionStatus, Venue } from '@/lib/types';

interface StatusBannerProps {
  relayStatus: ConnectionStatus;
  venueStatus: Record<Venue, ConnectionStatus> | undefined;
  isStale: boolean;
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: 'bg-bid',
  reconnecting: 'bg-yellow-500',
  disconnected: 'bg-ask',
};

const STATUS_TEXT: Record<ConnectionStatus, string> = {
  connected: 'text-bid',
  reconnecting: 'text-yellow-500',
  disconnected: 'text-ask',
};

function StatusDot({ status, label }: { status: ConnectionStatus; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status]}`} />
      <span className="text-gray-500">{label}</span>
      <span className={STATUS_TEXT[status]}>{status}</span>
    </div>
  );
}

function VenueStatus({ 
  venue, 
  status, 
  logo 
}: { 
  venue: string; 
  status: ConnectionStatus; 
  logo: string;
}) {
  const brandColor = venue === 'kalshi' ? 'border-kalshi' : 'border-polymarket';
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`relative w-4 h-4 rounded overflow-hidden border ${brandColor}`}>
        <Image
          src={logo}
          alt={`${venue} logo`}
          fill
          className="object-contain"
        />
      </div>
      <span className={STATUS_TEXT[status]}>{status}</span>
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
      className={`border-b border-gray-800/50 transition-all ${
        allConnected ? 'py-1.5 px-4' : 'py-2 px-4'
      }`}
    >
      <div className="flex items-center gap-5 flex-wrap">
        <StatusDot status={relayStatus} label="relay" />
        {venueStatus && (
          <>
            <VenueStatus 
              venue="polymarket" 
              status={venueStatus.polymarket} 
              logo="/logo-polymarket.png" 
            />
            <VenueStatus 
              venue="kalshi" 
              status={venueStatus.kalshi} 
              logo="/logo-kalshi.png" 
            />
          </>
        )}
        {isStale && (
          <span className="text-yellow-500 text-xs ml-auto">
            stale data (no update 30s)
          </span>
        )}
      </div>
    </div>
  );
}
