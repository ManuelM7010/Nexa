import React, { useState, useMemo } from 'react';
import {
  PieChart,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowRight,
  Edit2,
  Check,
  Copy,
  Sparkles,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldCheck,
  Scale,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  formatMoney,
  toCents,
  centsToInputString,
  getPreviousMonthString,
  getNextMonthString,
} from '../../services/financialEngine';
import { QuickMovementModal } from '../common/QuickMovementModal';
import { CategoryBudgetAnalysis } from '../../types';

export const BudgetView: React.FC = () => {
  const {
    budgetAnalysis,
    selectedYearMonth,
    setSelectedYearMonth,
    settings,
    setCategoryBudget,
    copyPreviousMonthBudget,
    categories,
    allTransactionsCombined,
  } = useFinancial();

  const { items, summary } = budgetAnalysis;

  // Local states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingAmountInput, setEditingAmountInput] = useState<string>('');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<
    'all' | 'over_budget' | 'savings' | 'warning' | 'unbudgeted'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUnbudgetedModalOpen, setIsUnbudgetedModalOpen] = useState<boolean>(false);
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState<boolean>(false);

  // Filter items based on active status filter and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by type
      if (filterType === 'over_budget' && !item.isOverBudget) return false;
      if (filterType === 'savings' && item.savingsCents <= 0) return false;
      if (filterType === 'warning' && item.status !== 'warning') return false;
      if (filterType === 'unbudgeted' && !item.isUnbudgeted) return false;

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.category.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filterType, searchQuery]);

  // Handle inline budget edit
  const handleStartEdit = (categoryId: string, currentCents: number) => {
    setEditingCategoryId(categoryId);
    setEditingAmountInput(centsToInputString(currentCents));
  };

  const handleSaveBudget = async (categoryId: string) => {
    const newCents = toCents(editingAmountInput);
    await setCategoryBudget(selectedYearMonth, categoryId, newCents);
    setEditingCategoryId(null);
  };

  // Rebalance: move savings from one category to an overdrawn category
  const handleApplyRebalance = async (
    fromCatId: string,
    toCatId: string,
    amountCents: number
  ) => {
    const fromItem = items.find((it) => it.category.id === fromCatId);
    const toItem = items.find((it) => it.category.id === toCatId);
    if (!fromItem || !toItem) return;

    // Reduce budget from donor category
    const newFromBudget = Math.max(0, fromItem.budgetedCents - amountCents);
    // Increase budget in recipient category
    const newToBudget = toItem.budgetedCents + amountCents;

    await setCategoryBudget(selectedYearMonth, fromCatId, newFromBudget);
    await setCategoryBudget(selectedYearMonth, toCatId, newToBudget);
  };

  const prevMonthStr = getPreviousMonthString(selectedYearMonth);
  const nextMonthStr = getNextMonthString(selectedYearMonth);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Análisis de Presupuesto vs Real
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-mono text-slate-300">
                  {selectedYearMonth}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Control de ahorros, sobregiros por partida, velocidad de gasto y movimientos no presupuestados
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setSelectedYearMonth(prevMonthStr)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Mes anterior"
            >
              ← {prevMonthStr}
            </button>
            <span className="px-2 text-xs font-mono font-bold text-blue-400">
              {selectedYearMonth}
            </span>
            <button
              onClick={() => setSelectedYearMonth(nextMonthStr)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Mes siguiente"
            >
              {nextMonthStr} →
            </button>
          </div>

          {/* Copy from previous month */}
          <button
            onClick={() => copyPreviousMonthBudget(selectedYearMonth)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            title="Clona las asignaciones del mes previo para este mes"
          >
            <Copy className="w-3.5 h-3.5 text-blue-400" />
            Copiar Mes Anterior
          </button>

          {/* Add Unbudgeted Expense / Movement */}
          <button
            onClick={() => setIsUnbudgetedModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-xs font-bold text-amber-300 transition cursor-pointer shadow-sm"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            + Gasto Fuera de Presupuesto
          </button>

          {/* General Add Movement */}
          <button
            onClick={() => setIsGeneralModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* 1. KEY EXECUTIVE FINANCIAL METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Presupuesto Esperado */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Presupuesto Esperado</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono-nums text-white mt-1.5">
            {formatMoney(summary.totalBudgetedCents, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {summary.totalCategoriesWithBudget} categorías configuradas
          </p>
        </div>

        {/* Gasto Real Confirmado */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Gasto Real Ejecutado</span>
            <TrendingUp className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-xl font-bold font-mono-nums text-blue-400 mt-1.5">
            {formatMoney(summary.totalRealCents, settings.currencySymbol)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
            <span>Proyectado al cierre:</span>
            <span className="font-mono-nums text-slate-200">
              {formatMoney(summary.totalProjectedCents, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Ahorro Bruto Logrado */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Ahorro Bruto Generado</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono-nums text-emerald-400 mt-1.5">
            +{formatMoney(summary.grossSavingsCents, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            En {summary.categoriesWithSavingsCount} categorías por debajo de la meta
          </p>
        </div>

        {/* Sobregiros Acumulados */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Sobregiro en Partidas</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono-nums text-rose-400 mt-1.5">
            {summary.grossOverrunCents > 0
              ? `-${formatMoney(summary.grossOverrunCents, settings.currencySymbol)}`
              : formatMoney(0, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1">
            {summary.categoriesOverBudgetCount} categorías excedidas
          </p>
        </div>

        {/* Ahorro Neto Consolidado Real */}
        <div
          className={`rounded-2xl border p-4 relative overflow-hidden ${
            summary.netSavingsCents >= 0
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-950/20 border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={summary.netSavingsCents >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
              Ahorro Neto Total
            </span>
            <Scale
              className={`w-4 h-4 ${
                summary.netSavingsCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            />
          </div>
          <div
            className={`text-xl font-bold font-mono-nums mt-1.5 ${
              summary.netSavingsCents >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {summary.netSavingsCents >= 0 ? '+' : ''}
            {formatMoney(summary.netSavingsCents, settings.currencySymbol)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Disciplina: {summary.disciplineRate}%</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                summary.netSavingsCents >= 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {summary.netSavingsCents >= 0 ? 'Superávit' : 'Déficit'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ADVANCED ANALYSIS: BURN RATE & CONSUMPTION SPEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Burn Rate & Pace Analysis */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Velocidad de Consumo y Ritmo Diario (Burn Rate)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Día {summary.daysElapsedInMonth} de {summary.totalDaysInMonth} ({summary.monthProgressPct}% del mes)
            </span>
          </div>

          {/* Visual Dual Progress Track */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">
                Tiempo transcurrido: <strong className="text-white">{summary.monthProgressPct}%</strong>
              </span>
              <span className="text-slate-400">
                Presupuesto consumido:{' '}
                <strong
                  className={
                    summary.totalBudgetedCents > 0 &&
                    summary.totalRealCents > summary.expectedRunRateCents
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }
                >
                  {summary.totalBudgetedCents > 0
                    ? Math.round((summary.totalRealCents / summary.totalBudgetedCents) * 100)
                    : 0}
                  %
                </strong>
              </span>
            </div>

            {/* Time progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden relative">
              <div
                className="h-full bg-slate-600 rounded-full transition-all duration-300"
                style={{ width: `${summary.monthProgressPct}%` }}
              />
            </div>

            {/* Spending progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  summary.burnRateDiffCents > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    summary.totalBudgetedCents > 0
                      ? (summary.totalRealCents / summary.totalBudgetedCents) * 100
                      : 0
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Diagnostic interpretation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Gasto esperado al día de hoy:</span>
              <span className="font-mono-nums font-bold text-white text-sm">
                {formatMoney(summary.expectedRunRateCents, settings.currencySymbol)}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Proporción lineal basada en los días transcurridos
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block text-[11px]">Diferencia de ritmo actual:</span>
              <span
                className={`font-mono-nums font-bold text-sm ${
                  summary.burnRateDiffCents > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {summary.burnRateDiffCents > 0 ? '+' : ''}
                {formatMoney(summary.burnRateDiffCents, settings.currencySymbol)}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary.burnRateDiffCents > 0
                  ? '⚠️ Estás gastando a un ritmo más acelerado que el promedio del mes.'
                  : '🟢 Tu ritmo de gasto está controlado y dentro de lo proyectado.'}
              </p>
            </div>
          </div>
        </div>

        {/* Smart Rebalance Opportunities */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Rebalanceo de Presupuesto</h3>
            </div>
            <p className="text-xs text-slate-400">
              Compensa partidas en sobregiro transfiriendo fondos desde categorías donde generaste ahorros.
            </p>

            {summary.rebalanceSuggestions.length > 0 ? (
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {summary.rebalanceSuggestions.slice(0, 3).map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 font-semibold truncate max-w-[110px]">
                        {sug.fromCategoryName}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-rose-400 font-semibold truncate max-w-[110px]">
                        {sug.toCategoryName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="font-mono font-bold text-white">
                        {formatMoney(sug.neededCents, settings.currencySymbol)}
                      </span>
                      <button
                        onClick={() =>
                          handleApplyRebalance(
                            sug.fromCategoryId,
                            sug.toCategoryId,
                            sug.neededCents
                          )
                        }
                        className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        Rebalancear 1-Clic
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                No se requieren transferencias. Todas tus partidas presupuestadas están equilibradas.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. UNBUDGETED / UNPLANNED EXPENSES SECTION */}
      {summary.unbudgetedCount > 0 && (
        <div className="rounded-2xl bg-amber-950/10 border border-amber-500/20 p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-300">
                Gastos Fuera de Presupuesto / Imprevistos Detectados ({summary.unbudgetedCount})
              </h3>
            </div>
            <div className="text-xs font-mono font-bold text-amber-300">
              Impacto Total: {formatMoney(summary.totalUnbudgetedCents, settings.currencySymbol)}
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Estos movimientos corresponden a gastos realizados que no contaban con partida presupuestada asignada o fueron marcados explícitamente como imprevistos:
          </p>

          <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
            {summary.unbudgetedTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              return (
                <div
                  key={tx.id}
                  className="p-3 flex items-center justify-between text-xs hover:bg-slate-850/50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-slate-500 text-[11px]">{tx.date}</span>
                    <span className="font-bold text-white">{tx.concept}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                      {cat?.name || 'Gasto'}
                    </span>
                    {tx.note && <span className="text-[11px] text-slate-400 italic">({tx.note})</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-rose-400">
                      -{formatMoney(tx.amountCents, settings.currencySymbol)}
                    </span>
                    <button
                      onClick={() => handleStartEdit(tx.categoryId, tx.amountCents)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-[11px] font-semibold transition cursor-pointer"
                      title="Asigna presupuesto a esta categoría para los próximos meses"
                    >
                      Asignar Presupuesto
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MAIN BUDGET VS REAL CATEGORY TABLE & DRILL-DOWN */}
      <div className="space-y-3">
        {/* Table Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({items.length})
            </button>
            <button
              onClick={() => setFilterType('over_budget')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                filterType === 'over_budget'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              Sobregiradas ({summary.categoriesOverBudgetCount})
            </button>
            <button
              onClick={() => setFilterType('savings')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                filterType === 'savings'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              Con Ahorro ({summary.categoriesWithSavingsCount})
            </button>
            <button
              onClick={() => setFilterType('warning')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                filterType === 'warning'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              Al Límite ({summary.categoriesAtLimitCount})
            </button>
            <button
              onClick={() => setFilterType('unbudgeted')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                filterType === 'unbudgeted'
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-400 hover:bg-indigo-500/10'
              }`}
            >
              Sin Presupuesto
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Detailed Table */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm">
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-3">Categoría de Gasto</div>
            <div className="col-span-2 text-right">Presupuesto Esperado</div>
            <div className="col-span-2 text-right">Gasto Real</div>
            <div className="col-span-2 text-right">Gasto Total Proyectado</div>
            <div className="col-span-3 text-right">Resultado: Ahorro / Sobregiro</div>
          </div>

          <div className="divide-y divide-slate-800/80">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No hay categorías que coincidan con los filtros seleccionados.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isEditing = editingCategoryId === item.category.id;
                const isExpanded = expandedCategoryId === item.category.id;
                const percentClamped = Math.min(100, Math.max(0, item.percentUsed));

                return (
                  <div key={item.category.id} className="transition">
                    {/* Main Row */}
                    <div className="p-4 flex flex-col lg:grid lg:grid-cols-12 gap-2.5 lg:gap-3 items-start lg:items-center text-xs hover:bg-slate-850/40">
                      {/* Category Name & Status Badge */}
                      <div className="col-span-3 flex items-center justify-between w-full lg:w-auto">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setExpandedCategoryId(isExpanded ? null : item.category.id)
                            }
                            className="p-1 rounded text-slate-500 hover:text-white cursor-pointer"
                            title="Ver desglose de movimientos"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.category.color }}
                          />
                          <span className="font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                            {item.category.name}
                          </span>
                        </div>

                        {/* Status badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                            item.status === 'over_budget'
                              ? 'bg-rose-500/20 text-rose-300'
                              : item.status === 'warning'
                              ? 'bg-amber-500/20 text-amber-300'
                              : item.status === 'savings'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : item.status === 'unbudgeted'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </div>

                      {/* Presupuesto Esperado (Editable) */}
                      <div className="col-span-2 flex lg:block justify-between w-full lg:w-auto lg:text-right">
                        <span className="lg:hidden text-slate-400">Esperado:</span>
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              step="1"
                              value={editingAmountInput}
                              onChange={(e) => setEditingAmountInput(e.target.value)}
                              className="w-24 px-2 py-1 rounded bg-slate-800 border border-blue-500 text-right font-mono-nums text-white text-xs"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveBudget(item.category.id)}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                              title="Guardar presupuesto"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() =>
                              handleStartEdit(item.category.id, item.budgetedCents)
                            }
                            className="group cursor-pointer flex items-center lg:justify-end gap-1 font-mono-nums font-bold text-slate-200 hover:text-blue-400 transition"
                            title="Clic para definir monto esperado"
                          >
                            <span>
                              {formatMoney(item.budgetedCents, settings.currencySymbol)}
                            </span>
                            <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        )}
                      </div>

                      {/* Gasto Real */}
                      <div className="col-span-2 flex lg:block justify-between w-full lg:w-auto lg:text-right font-mono-nums text-slate-200">
                        <span className="lg:hidden text-slate-400">Real:</span>
                        <div className="flex lg:flex-col lg:items-end justify-between items-center">
                          <span className="font-bold">
                            {formatMoney(item.realSpentCents, settings.currencySymbol)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.realTransactions.length} mov.
                          </span>
                        </div>
                      </div>

                      {/* Gasto Total Proyectado */}
                      <div className="col-span-2 flex lg:block justify-between w-full lg:w-auto lg:text-right font-mono-nums">
                        <span className="lg:hidden text-slate-400">Proyectado:</span>
                        <div className="flex lg:flex-col lg:items-end justify-between items-center">
                          <span
                            className={`font-bold ${
                              item.isOverBudget ? 'text-rose-400' : 'text-slate-300'
                            }`}
                          >
                            {formatMoney(item.totalProjectedCents, settings.currencySymbol)}
                          </span>
                          {item.plannedPendingCents > 0 && (
                            <span className="text-[10px] text-slate-500">
                              +{formatMoney(item.plannedPendingCents, settings.currencySymbol)} planif.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ahorro vs Sobregiro Result & Progress */}
                      <div className="col-span-3 w-full space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            {item.budgetedCents > 0
                              ? `${item.percentUsed.toFixed(0)}% ejecutado`
                              : 'Sin presupuesto'}
                          </span>

                          {/* Savings or Overrun indicator */}
                          {item.budgetedCents > 0 ? (
                            item.isOverBudget ? (
                              <span className="font-mono-nums font-bold text-rose-400">
                                Sobregiro: -
                                {formatMoney(item.overrunCents, settings.currencySymbol)}
                              </span>
                            ) : (
                              <span className="font-mono-nums font-bold text-emerald-400">
                                Ahorro: +
                                {formatMoney(item.savingsCents, settings.currencySymbol)}
                              </span>
                            )
                          ) : (
                            <span className="font-mono-nums font-bold text-indigo-400">
                              Imprevisto: -
                              {formatMoney(item.realSpentCents, settings.currencySymbol)}
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.isOverBudget
                                ? 'bg-rose-500'
                                : item.percentUsed > 80
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${percentClamped}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Drill-Down: List of Movements in this category */}
                    {isExpanded && (
                      <div className="px-6 py-3 bg-slate-950/70 border-t border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] pb-1 border-b border-slate-800/60">
                          <span>Movimientos de "{item.category.name}" en este período:</span>
                          <span>
                            {item.transactions.length} movimientos registrados
                          </span>
                        </div>

                        {item.transactions.length === 0 ? (
                          <p className="text-slate-500 italic py-1">
                            No hay movimientos registrados para esta categoría en {selectedYearMonth}.
                          </p>
                        ) : (
                          <div className="divide-y divide-slate-800/40">
                            {item.transactions.map((tx) => (
                              <div
                                key={tx.id}
                                className="py-2 flex items-center justify-between text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-slate-400">
                                    {tx.date}
                                  </span>
                                  <span className="font-medium text-white">{tx.concept}</span>
                                  {tx.isUnbudgeted && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold">
                                      Imprevisto
                                    </span>
                                  )}
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                                      tx.status === 'completed'
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'bg-blue-500/10 text-blue-400'
                                    }`}
                                  >
                                    {tx.status === 'completed' ? 'Efectuado' : 'Planificado'}
                                  </span>
                                </div>
                                <div className="font-mono font-bold text-slate-200">
                                  {formatMoney(tx.amountCents, settings.currencySymbol)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal for adding unbudgeted / unexpected movements */}
      <QuickMovementModal
        isOpen={isUnbudgetedModalOpen}
        onClose={() => setIsUnbudgetedModalOpen(false)}
        defaultIsUnbudgeted={true}
      />

      {/* Modal for adding regular movements */}
      <QuickMovementModal
        isOpen={isGeneralModalOpen}
        onClose={() => setIsGeneralModalOpen(false)}
        defaultIsUnbudgeted={false}
      />
    </div>
  );
};
