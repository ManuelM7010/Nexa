import React from 'react';
import { WifiOff, ShieldCheck } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-950/90 border border-amber-600/40 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2"
    >
      <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
      <span>Modo Offline activo</span>
      <span className="text-amber-300/70 border-l border-amber-800/80 pl-2 flex items-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        Tus datos se guardan localmente
      </span>
    </div>
  );
};
