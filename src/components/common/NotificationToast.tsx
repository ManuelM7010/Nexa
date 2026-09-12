import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const NotificationToast: React.FC = () => {
  const { notification, clearNotification } = useFinancial();

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error';

  return (
    <div
      id="notification-toast"
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-medium shadow-2xl backdrop-blur-md border transition-all duration-300 animate-in slide-in-from-top-3 max-w-sm ${
        isSuccess
          ? 'bg-emerald-950/90 text-emerald-100 border-emerald-600/40'
          : isError
          ? 'bg-rose-950/90 text-rose-100 border-rose-600/40'
          : 'bg-slate-900/95 text-slate-100 border-slate-700'
      }`}
    >
      {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
      {isError && <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
      {!isSuccess && !isError && <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />}

      <span className="flex-1 leading-snug">{notification.message}</span>

      <button
        onClick={clearNotification}
        className="text-slate-400 hover:text-white p-0.5 rounded transition cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
