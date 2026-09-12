import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  FileText,
  Calendar,
  Save,
  Award,
  AlertTriangle,
  Sparkles,
  PieChart,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  formatMoney,
  getPreviousMonthString,
  getNextMonthString,
} from '../../services/financialEngine';

export const MonthlyCloseView: React.FC = () => {
  const {
    selectedYearMonth,
    monthlySummary,
    budgetVsReal,
    monthlyCloses,
    settings,
    saveMonthlyClose,
  } = useFinancial();

  const existingClose = monthlyCloses.find((c) => c.yearMonth === selectedYearMonth);

  const [notes, setNotes] = useState(existingClose?.notes || '');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (existingClose) {
      setNotes(existingClose.notes || '');
    } else {
      setNotes('');
    }
    setIsSaved(false);
  }, [existingClose, selectedYearMonth]);

  const handleExecuteClose = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveMonthlyClose({
      yearMonth: selectedYearMonth,
      initialBalanceCents: monthlySummary.initialBalanceCents,
      realIncomeCents: monthlySummary.realIncomeCents,
      realExpenseCents: monthlySummary.realExpenseCents,
      finalRealBalanceCents: monthlySummary.finalRealBalanceCents,
      plannedIncomeCents: monthlySummary.plannedIncomeCents,
      plannedExpenseCents: monthlySummary.plannedExpenseCents,
      closedAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
    });
    setIsSaved(true);
  };

  // Month-end core calculations (Ahorré o Gasté de Más)
  // 1. Ahorro Neto Real = Ingresos Reales - Gastos Reales
  const netRealSavingsCents = monthlySummary.realIncomeCents - monthlySummary.realExpenseCents;
  const isNetSavingsPositive = netRealSavingsCents >= 0;

  // 2. Desviación Presupuestaria de Gastos = Gastos Presupuestados - Gastos Reales
  // Si Gastos Reales < Gastos Planificados -> Ahorro en presupuesto (Positivo)
  // Si Gastos Reales > Gastos Planificados -> Gasto de más / Sobregiro (Negativo)
  const expenseSavingsVsBudget = monthlySummary.plannedExpenseCents - monthlySummary.realExpenseCents;
  const didSaveInBudget = expenseSavingsVsBudget >= 0;

  // Categorías que generaron ahorro vs sobregiro
  const { savedCategories, overspentCategories } = useMemo(() => {
    const saved: typeof budgetVsReal = [];
    const over: typeof budgetVsReal = [];

    budgetVsReal.forEach((item) => {
      const diff = item.budgetedAmountCents - item.totalProjectedSpentCents;
      if (item.budgetedAmountCents > 0) {
        if (diff > 0) saved.push(item);
        else if (diff < 0) over.push(item);
      }
    });

    saved.sort((a, b) => (b.budgetedAmountCents - b.totalProjectedSpentCents) - (a.budgetedAmountCents - a.totalProjectedSpentCents));
    over.sort((a, b) => (a.budgetedAmountCents - a.totalProjectedSpentCents) - (b.budgetedAmountCents - b.totalProjectedSpentCents));

    return { savedCategories: saved, overspentCategories: over };
  }, [budgetVsReal]);

  const incomeDeviation = monthlySummary.realIncomeCents - monthlySummary.plannedIncomeCents;
  const expenseDeviation = monthlySummary.realExpenseCents - monthlySummary.plannedExpenseCents;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            Cierre Contable y Veredicto Final ({selectedYearMonth})
          </h2>
          <p className="text-xs text-slate-400">
            Responde de forma definitiva: ¿Ahorraste o gastaste de más este mes? Formaliza el período contable
          </p>
        </div>

        {existingClose && (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Período Cerrado Oficialmente
          </span>
        )}
      </div>

      {/* BIG VERDICT BANNER: ¿AHORRÉ O GASTÉ DE MÁS? */}
      <div
        className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden ${
          isNetSavingsPositive
            ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/40 text-emerald-100'
            : 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-950 border-rose-500/40 text-rose-100'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg ${
                isNetSavingsPositive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isNetSavingsPositive ? <Award className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">
                Veredicto Financiero del Mes
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mt-0.5">
                {isNetSavingsPositive
                  ? '¡FELICITACIONES! ESTE MES LOGRASTE AHORRAR'
                  : 'ATENCIÓN: ESTE MES GASTASTE DE MÁS'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                {isNetSavingsPositive
                  ? `Tus ingresos superaron tus gastos en ${formatMoney(netRealSavingsCents, settings.currencySymbol)}. Tienes un flujo positivo que fortalece tu patrimonio.`
                  : `Tus gastos superaron tus ingresos en ${formatMoney(Math.abs(netRealSavingsCents), settings.currencySymbol)}. Generaste un déficit que requirió usar ahorros o endeudamiento.`}
              </p>
            </div>
          </div>

          <div className="text-left md:text-right bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 min-w-[200px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {isNetSavingsPositive ? 'Ahorro Neto Conseguido' : 'Déficit / Sobregiro Generado'}
            </span>
            <div
              className={`text-2xl font-black font-mono-nums mt-0.5 ${
                isNetSavingsPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isNetSavingsPositive ? '+' : '-'}
              {formatMoney(Math.abs(netRealSavingsCents), settings.currencySymbol)}
            </div>
            <span className="text-[10px] text-slate-400">
              {monthlySummary.realIncomeCents > 0
                ? `${((Math.abs(netRealSavingsCents) / monthlySummary.realIncomeCents) * 100).toFixed(1)}% de tus ingresos`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Closing Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold">Saldo Inicial Heredado</span>
          <div className="text-xl font-bold font-mono-nums text-white">
            {formatMoney(monthlySummary.initialBalanceCents, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-500">
            Proveniente del cierre de {getPreviousMonthString(selectedYearMonth)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold">Flujo Neto Real (Ingresos - Gastos)</span>
          <div
            className={`text-xl font-bold font-mono-nums ${
              netRealSavingsCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netRealSavingsCents >= 0 ? '+' : ''}
            {formatMoney(netRealSavingsCents, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-500">
            Ingresos reales: {formatMoney(monthlySummary.realIncomeCents, settings.currencySymbol)} / Gastos: {formatMoney(monthlySummary.realExpenseCents, settings.currencySymbol)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <span className="text-xs text-slate-400 font-semibold">Saldo Final de Cierre</span>
          <div
            className={`text-xl font-bold font-mono-nums ${
              monthlySummary.finalRealBalanceCents >= 0 ? 'text-blue-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(monthlySummary.finalRealBalanceCents, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-500">
            Saldo que se transfiere al mes de {getNextMonthString(selectedYearMonth)}
          </p>
        </div>
      </div>

      {/* Two Column Breakdown: Dónde se Ahorró vs Dónde se Gastó de Más */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Where you saved */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              <span>Categorías donde Ahorraste ({savedCategories.length})</span>
            </h4>
          </div>

          {savedCategories.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No hubo categorías con remanente positivo respecto a lo presupuestado.
            </p>
          ) : (
            <div className="space-y-2">
              {savedCategories.slice(0, 4).map((c) => {
                const saved = c.budgetedAmountCents - c.totalProjectedSpentCents;
                return (
                  <div
                    key={c.category.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{c.category.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Ppto: {formatMoney(c.budgetedAmountCents, settings.currencySymbol)} | Real: {formatMoney(c.totalProjectedSpentCents, settings.currencySymbol)}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-emerald-400">
                      +{formatMoney(saved, settings.currencySymbol)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Where you overspent */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Categorías con Sobregiro ({overspentCategories.length})</span>
            </h4>
          </div>

          {overspentCategories.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              ¡Perfecto! Ninguna categoría sobrepasó el monto presupuestado.
            </p>
          ) : (
            <div className="space-y-2">
              {overspentCategories.slice(0, 4).map((c) => {
                const over = c.totalProjectedSpentCents - c.budgetedAmountCents;
                return (
                  <div
                    key={c.category.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{c.category.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Ppto: {formatMoney(c.budgetedAmountCents, settings.currencySymbol)} | Real: {formatMoney(c.totalProjectedSpentCents, settings.currencySymbol)}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-rose-400">
                      -{formatMoney(over, settings.currencySymbol)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comparative Table: Planificado vs Real */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 font-bold text-xs text-white">
          Comparativa de Cierre Detallada: Presupuesto vs Real
        </div>

        <div className="divide-y divide-slate-800/80 text-xs">
          <div className="grid grid-cols-12 p-4 items-center gap-3">
            <div className="col-span-4 font-semibold text-slate-300">Ingresos Totales</div>
            <div className="col-span-3 text-right font-mono-nums text-slate-400">
              Plan: {formatMoney(monthlySummary.plannedIncomeCents, settings.currencySymbol)}
            </div>
            <div className="col-span-3 text-right font-mono-nums font-bold text-emerald-400">
              Real: {formatMoney(monthlySummary.realIncomeCents, settings.currencySymbol)}
            </div>
            <div
              className={`col-span-2 text-right font-mono-nums font-bold ${
                incomeDeviation >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {incomeDeviation >= 0 ? '+' : ''}
              {formatMoney(incomeDeviation, settings.currencySymbol)}
            </div>
          </div>

          <div className="grid grid-cols-12 p-4 items-center gap-3">
            <div className="col-span-4 font-semibold text-slate-300">Gastos y Obligaciones</div>
            <div className="col-span-3 text-right font-mono-nums text-slate-400">
              Plan: {formatMoney(monthlySummary.plannedExpenseCents, settings.currencySymbol)}
            </div>
            <div className="col-span-3 text-right font-mono-nums font-bold text-rose-400">
              Real: {formatMoney(monthlySummary.realExpenseCents, settings.currencySymbol)}
            </div>
            <div
              className={`col-span-2 text-right font-mono-nums font-bold ${
                expenseDeviation <= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {expenseDeviation > 0 ? '+' : ''}
              {formatMoney(expenseDeviation, settings.currencySymbol)}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Notes & Close Action */}
      <form onSubmit={handleExecuteClose} className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-white mb-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-400" />
            Notas y Reflexión Financiera del Mes ({selectedYearMonth})
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="¿Qué metas se cumplieron? ¿Qué gastos imprevistos ocurrieron? ¿Qué ajustes haremos para el próximo mes?..."
            className="w-full rounded-xl bg-slate-850 border border-slate-700 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {isSaved ? (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Cierre mensual guardado con éxito.
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Al guardar, se formalizará el cierre de {selectedYearMonth}.
            </span>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20 active:scale-95 transition cursor-pointer flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>{existingClose ? 'Actualizar Cierre de Mes' : 'Cerrar Período Contable'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
