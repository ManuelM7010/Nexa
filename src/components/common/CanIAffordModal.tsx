import React, { useState, useMemo } from 'react';
import { HelpCircle, X, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, Wallet, ShieldAlert } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatMoney, toCents, analyzeAffordability } from '../../services/financialEngine';

interface CanIAffordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CanIAffordModal: React.FC<CanIAffordModalProps> = ({ isOpen, onClose }) => {
  const { todayCashBalanceCents, executiveSummary, settings } = useFinancial();
  const [expenseInput, setExpenseInput] = useState<string>('150');
  const [concept, setConcept] = useState<string>('Gasto planeado');

  const expenseCents = useMemo(() => toCents(expenseInput), [expenseInput]);

  const analysis = useMemo(() => {
    return analyzeAffordability(
      expenseCents,
      todayCashBalanceCents,
      executiveSummary.committedObligationsNext30DaysCents
    );
  }, [expenseCents, todayCashBalanceCents, executiveSummary.committedObligationsNext30DaysCents]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">¿Puedo pagarlo?</h3>
              <p className="text-xs text-slate-400">Simulador de impacto financiero antes de realizar un gasto</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Concepto o Compra</label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Cena especial, Ropa nueva..."
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Monto Estimado</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">{settings.currencySymbol}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={expenseInput}
                onChange={(e) => setExpenseInput(e.target.value)}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-7 pr-3 py-2 text-xs font-mono-nums font-bold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Financial Impact Breakdown */}
        <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/60">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
              Saldo actual líquido (Bancos + Efectivo)
            </span>
            <span className="font-bold font-mono-nums text-white">
              {formatMoney(analysis.currentBalanceCents, settings.currencySymbol)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/60">
            <span className="text-rose-400 font-medium">(-) Gasto propuesto</span>
            <span className="font-bold font-mono-nums text-rose-400">
              -{formatMoney(analysis.proposedExpenseCents, settings.currencySymbol)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/60">
            <span className="text-slate-300 font-semibold">(=) Saldo posterior al gasto</span>
            <span
              className={`font-bold font-mono-nums ${
                analysis.balanceAfterExpenseCents < 0 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {formatMoney(analysis.balanceAfterExpenseCents, settings.currencySymbol)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/60">
            <span className="text-amber-400/90 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              (-) Obligaciones próximas comprometidas (30 días)
            </span>
            <span className="font-bold font-mono-nums text-amber-400">
              -{formatMoney(analysis.committedObligationsCents, settings.currencySymbol)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-200 font-bold">(=) Saldo final libre tras obligaciones</span>
            <span
              className={`font-extrabold font-mono-nums text-sm ${
                analysis.balanceAfterObligationsCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatMoney(analysis.balanceAfterObligationsCents, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Verdict Badge */}
        <div
          className={`rounded-xl p-4 border flex items-start gap-3 transition-colors ${
            analysis.status === 'safe'
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200'
              : analysis.status === 'tight'
              ? 'bg-amber-950/50 border-amber-500/30 text-amber-200'
              : 'bg-rose-950/50 border-rose-500/30 text-rose-200'
          }`}
        >
          {analysis.status === 'safe' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
          {analysis.status === 'tight' && <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />}
          {analysis.status === 'danger' && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />}

          <div className="text-xs space-y-1">
            <div className="font-bold text-sm text-white">{analysis.statusLabel}</div>
            <p className="leading-relaxed text-slate-300">{analysis.explanation}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
