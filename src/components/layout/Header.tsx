import React, { useState } from 'react';
import { Plus, HelpCircle, Shield, Menu, X, Sparkles } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { QuickMovementModal } from '../common/QuickMovementModal';
import { CanIAffordModal } from '../common/CanIAffordModal';

interface HeaderProps {
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileNav }) => {
  const { currentView, setCurrentView } = useFinancial();
  const [isQuickMovementOpen, setIsQuickMovementOpen] = useState(false);
  const [isCanIAffordOpen, setIsCanIAffordOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-2.5 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          {onToggleMobileNav && (
            <button
              onClick={onToggleMobileNav}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Custom SVG Logo Mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-0.5 border border-blue-500/30 shadow-md group-hover:border-blue-400/60 transition">
              <img src="/icon.svg" alt="NEXA" className="w-full h-full object-contain rounded-lg" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-blue-400 transition">
                  NEXA
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                  FINANCE
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-tight hidden sm:block">
                Personal Finance & Daily Cash Flow
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* ¿Puedo pagarlo? Analysis Button */}
          <button
            id="btn-can-i-afford"
            onClick={() => setIsCanIAffordOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
            title="Herramienta de análisis ¿Puedo pagarlo?"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>¿Puedo pagarlo?</span>
          </button>

          {/* Primary CTA: + Nuevo Movimiento */}
          <button
            id="btn-new-movement-header"
            onClick={() => setIsQuickMovementOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Nuevo movimiento</span>
            <span className="xs:hidden">Nuevo</span>
          </button>
        </div>
      </header>

      {/* Modals */}
      <QuickMovementModal
        isOpen={isQuickMovementOpen}
        onClose={() => setIsQuickMovementOpen(false)}
      />

      <CanIAffordModal
        isOpen={isCanIAffordOpen}
        onClose={() => setIsCanIAffordOpen(false)}
      />
    </>
  );
};
