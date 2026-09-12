import React, { useState, useMemo } from 'react';
import {
  Table,
  Filter,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Search,
  Plus,
  Edit3,
  CheckCircle2,
  AlertCircle,
  CreditCard as CardIcon,
  Wallet,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  PieChart,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { Transaction, Category, Account, CreditCard } from '../../types';
import {
  formatMoney,
  toCents,
  centsToInputString,
  getTodayDateString,
} from '../../services/financialEngine';
import { QuickMovementModal } from '../common/QuickMovementModal';

interface ExecutionModalData {
  transaction: Transaction;
  plannedAmountCents: number;
  currentActualCents: number;
}

export const MonthlyMatrixView: React.FC = () => {
  const {
    allTransactionsCombined,
    selectedYearMonth,
    categories,
    accounts,
    creditCards,
    settings,
    updateTransactionExecution,
  } = useFinancial();

  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'variance' | 'amount' | 'progress'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal for partial / actual spending input ($50 budgeted -> entered $30 spent on Wednesday)
  const [executionModal, setExecutionModal] = useState<ExecutionModalData | null>(null);
  const [actualInput, setActualInput] = useState<string>('');
  const [executionNote, setExecutionNote] = useState<string>('');

  // Quick movement modal
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);

  // Month transactions
  const monthTransactions = useMemo(() => {
    return allTransactionsCombined.filter((t) => {
      const txMonth = (t.date || t.expectedDate || '').slice(0, 7);
      return txMonth === selectedYearMonth;
    });
  }, [allTransactionsCombined, selectedYearMonth]);

  // Enriched rows for the matrix
  const matrixRows = useMemo(() => {
    return monthTransactions
      .filter((t) => {
        // Filter by type
        if (typeFilter === 'expense' && t.type !== 'expense' && t.type !== 'subscription' && t.type !== 'service' && t.type !== 'installment_payment') {
          return false;
        }
        if (typeFilter === 'income' && t.type !== 'income') {
          return false;
        }

        // Filter by category
        if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) {
          return false;
        }

        // Filter by payment method
        if (methodFilter !== 'all') {
          if (methodFilter.startsWith('acc_') && t.accountId !== methodFilter) return false;
          if (methodFilter.startsWith('card_') && t.creditCardId !== methodFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesConcept = t.concept.toLowerCase().includes(q);
          const cat = categories.find((c) => c.id === t.categoryId);
          const matchesCat = cat?.name.toLowerCase().includes(q) || false;
          if (!matchesConcept && !matchesCat) return false;
        }

        return true;
      })
      .map((t) => {
        const cat = categories.find((c) => c.id === t.categoryId);
        const account = accounts.find((a) => a.id === t.accountId);
        const card = creditCards.find((c) => c.id === t.creditCardId);

        // Determine expected / budgeted amount vs actual spent
        const plannedCents = t.plannedAmountCents ?? t.amountCents;
        const actualCents = t.status === 'completed'
          ? (t.actualAmountCents ?? t.amountCents)
          : (t.actualAmountCents ?? 0);

        // Progress percentage
        const progressPct = plannedCents > 0
          ? Math.min(100, Math.round((actualCents / plannedCents) * 100))
          : 0;

        // Available balance
        const availableCents = plannedCents - actualCents;

        // Is income vs expense logic for variation
        const isExpense = t.type !== 'income';

        // For expenses: if spent < planned = savings (positive outcome). If spent > planned = overrun.
        // For incomes: if collected > planned = extra (positive). If collected < planned = pending.
        const isOverBudget = isExpense ? actualCents > plannedCents : false;
        const isSaving = isExpense ? (actualCents < plannedCents && t.status === 'completed') : false;

        let paymentMethodLabel = 'Sin asignar';
        if (card) {
          paymentMethodLabel = `Tarjeta: ${card.name}`;
        } else if (account) {
          paymentMethodLabel = account.name;
        }

        return {
          transaction: t,
          category: cat,
          account,
          card,
          paymentMethodLabel,
          isExpense,
          plannedCents,
          actualCents,
          progressPct,
          availableCents,
          isOverBudget,
          isSaving,
          varianceCents: isExpense ? (plannedCents - actualCents) : (actualCents - plannedCents),
        };
      });
  }, [monthTransactions, typeFilter, methodFilter, categoryFilter, searchQuery, categories, accounts, creditCards]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...matrixRows].sort((a, b) => {
      let comp = 0;
      if (sortBy === 'date') {
        comp = a.transaction.date.localeCompare(b.transaction.date);
      } else if (sortBy === 'amount') {
        comp = a.plannedCents - b.plannedCents;
      } else if (sortBy === 'variance') {
        comp = a.varianceCents - b.varianceCents;
      } else if (sortBy === 'progress') {
        comp = a.progressPct - b.progressPct;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [matrixRows, sortBy, sortOrder]);

  // Aggregated totals
  const totals = useMemo(() => {
    let totalPlannedExpense = 0;
    let totalActualExpense = 0;
    let totalPlannedIncome = 0;
    let totalActualIncome = 0;

    matrixRows.forEach((r) => {
      if (r.isExpense) {
        totalPlannedExpense += r.plannedCents;
        totalActualExpense += r.actualCents;
      } else {
        totalPlannedIncome += r.plannedCents;
        totalActualIncome += r.actualCents;
      }
    });

    const expenseAvailable = totalPlannedExpense - totalActualExpense;
    const expenseSavingsOrOverrun = totalPlannedExpense - totalActualExpense;

    return {
      totalPlannedExpense,
      totalActualExpense,
      totalPlannedIncome,
      totalActualIncome,
      expenseAvailable,
      expenseSavingsOrOverrun,
    };
  }, [matrixRows]);

  const handleOpenExecutionModal = (row: typeof matrixRows[0]) => {
    setExecutionModal({
      transaction: row.transaction,
      plannedAmountCents: row.plannedCents,
      currentActualCents: row.actualCents,
    });
    setActualInput(centsToInputString(row.actualCents > 0 ? row.actualCents : row.plannedCents));
    setExecutionNote(row.transaction.partialExecutionNote || '');
  };

  const handleSaveExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executionModal) return;
    const actualCents = toCents(actualInput);
    await updateTransactionExecution(
      executionModal.transaction.id,
      actualCents,
      executionNote.trim() || undefined
    );
    setExecutionModal(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-400" />
            Matriz Mensual Presupuesto vs Real ({selectedYearMonth})
          </h2>
          <p className="text-xs text-slate-400">
            Control analítico por categorías y métodos de pago con registro de ejecución parcial, ahorro y sobregiro
          </p>
        </div>

        <button
          onClick={() => setIsNewMovementOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Movimiento / Ppto</span>
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Presupuestado (Gastos)
          </span>
          <div className="text-xl font-black font-mono-nums text-white">
            {formatMoney(totals.totalPlannedExpense, settings.currencySymbol)}
          </div>
          <span className="text-[10px] text-slate-500">Monto esperado del mes</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Real Gastado a la Fecha
          </span>
          <div className="text-xl font-black font-mono-nums text-rose-400">
            {formatMoney(totals.totalActualExpense, settings.currencySymbol)}
          </div>
          <span className="text-[10px] text-slate-500">
            {totals.totalPlannedExpense > 0
              ? `${((totals.totalActualExpense / totals.totalPlannedExpense) * 100).toFixed(1)}% ejecutado`
              : '0%'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Disponible Restante
          </span>
          <div className={`text-xl font-black font-mono-nums ${totals.expenseAvailable >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatMoney(totals.expenseAvailable, settings.currencySymbol)}
          </div>
          <span className="text-[10px] text-slate-500">Saldo por ejecutar sin sobregiro</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Variación Neta / Ahorro
          </span>
          <div className={`text-xl font-black font-mono-nums flex items-center gap-1.5 ${totals.expenseSavingsOrOverrun >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totals.expenseSavingsOrOverrun >= 0 ? (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingUp className="w-4 h-4 text-rose-400" />
            )}
            {formatMoney(Math.abs(totals.expenseSavingsOrOverrun), settings.currencySymbol)}
          </div>
          <span className="text-[10px] text-slate-500">
            {totals.expenseSavingsOrOverrun >= 0 ? 'Ahorro / Holgura disponible' : 'Sobregiro total en gastos'}
          </span>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type toggles */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                typeFilter === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                typeFilter === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ingresos
            </button>
          </div>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Filtrar por método de pago"
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">💳 Todos los Métodos de Pago</option>
            <optgroup label="Cuentas Bancarias / Efectivo">
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Tarjetas de Crédito">
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  Tarjeta: {card.name} ({card.bank})
                </option>
              ))}
            </optgroup>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filtrar por categoría"
            className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">🏷️ Todas las Categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type === 'expense' ? 'Gasto' : 'Ingreso'})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por concepto o categoría..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Master Table */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha / Concepto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4 text-right">Presupuestado</th>
                <th className="py-3 px-4 text-right">Real Gastado</th>
                <th className="py-3 px-4 text-center">Cumplimiento %</th>
                <th className="py-3 px-4 text-right">Disponible</th>
                <th className="py-3 px-4 text-right">Variación / Resultado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No se encontraron gastos o ingresos para los filtros seleccionados en {selectedYearMonth}.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => {
                  const { transaction, category, paymentMethodLabel, isExpense, plannedCents, actualCents, progressPct, availableCents, isOverBudget, isSaving } = row;

                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-slate-850/40 transition group"
                    >
                      {/* Concept & Date */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{transaction.concept}</span>
                          {transaction.isUnbudgeted && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Imprevisto
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-nums flex items-center gap-2 mt-0.5">
                          <span>{transaction.date}</span>
                          {transaction.partialExecutionNote && (
                            <span className="text-blue-400 italic">
                              "{transaction.partialExecutionNote}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
                          style={{
                            backgroundColor: `${category?.color || '#3B82F6'}15`,
                            borderColor: `${category?.color || '#3B82F6'}30`,
                            color: category?.color || '#93C5FD',
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: category?.color || '#3B82F6' }}
                          />
                          {category?.name || 'General'}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          {row.card ? (
                            <CardIcon className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <Wallet className="w-3.5 h-3.5 text-blue-400" />
                          )}
                          <span className="text-xs">{paymentMethodLabel}</span>
                        </div>
                      </td>

                      {/* Budgeted / Expected */}
                      <td className="py-3 px-4 text-right font-mono-nums font-bold text-slate-200">
                        {formatMoney(plannedCents, settings.currencySymbol)}
                      </td>

                      {/* Actual Spent */}
                      <td className="py-3 px-4 text-right font-mono-nums font-bold">
                        <span
                          className={
                            actualCents === 0
                              ? 'text-slate-500'
                              : isExpense
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }
                        >
                          {formatMoney(actualCents, settings.currencySymbol)}
                        </span>
                      </td>

                      {/* Progress % */}
                      <td className="py-3 px-4 text-center">
                        <div className="w-24 mx-auto space-y-1">
                          <div className="flex justify-between text-[10px] font-mono-nums">
                            <span className="text-slate-400">{progressPct}%</span>
                            {progressPct >= 100 && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                            )}
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                progressPct > 100
                                  ? 'bg-rose-500'
                                  : progressPct >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, progressPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Available */}
                      <td className="py-3 px-4 text-right font-mono-nums">
                        <span
                          className={`font-semibold ${
                            availableCents < 0
                              ? 'text-rose-400'
                              : availableCents === 0
                              ? 'text-slate-500'
                              : 'text-emerald-400'
                          }`}
                        >
                          {formatMoney(availableCents, settings.currencySymbol)}
                        </span>
                      </td>

                      {/* Variation / Result */}
                      <td className="py-3 px-4 text-right font-mono-nums">
                        {isOverBudget ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Sobregiro: -{formatMoney(Math.abs(availableCents), settings.currencySymbol)}
                          </span>
                        ) : isSaving ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Ahorro: +{formatMoney(availableCents, settings.currencySymbol)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {actualCents === 0 ? 'Pendiente' : 'En presupuesto'}
                          </span>
                        )}
                      </td>

                      {/* Action: Update Partial / Real Spending */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenExecutionModal(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 cursor-pointer shadow-sm"
                          title="Ingresar o ajustar cuánto se ha gastado realmente (ej: $30 al día miércoles)"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Gasto Real</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Input Partial Spending ($50 budgeted, $30 spent on Wednesday) */}
      {executionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Control de Ejecución Presupuestaria
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Registrar Gasto o Ingreso Real
                </h3>
              </div>
              <button
                onClick={() => setExecutionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Concepto:</span>
                <span className="font-bold text-white">{executionModal.transaction.concept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Presupuesto original:</span>
                <span className="font-mono font-bold text-blue-400">
                  {formatMoney(executionModal.plannedAmountCents, settings.currencySymbol)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveExecution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ¿Cuánto se ha gastado / cobrado realmente a la fecha? ({settings.currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                    {settings.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={actualInput}
                    onChange={(e) => setActualInput(e.target.value)}
                    placeholder="Ej. 30.00"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-bold text-white focus:outline-none focus:border-blue-500 font-mono-nums"
                  />
                </div>
                {/* Instant Calculation Preview */}
                <div className="mt-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs space-y-1 font-mono-nums">
                  {(() => {
                    const currentActual = toCents(actualInput);
                    const planned = executionModal.plannedAmountCents;
                    const diff = planned - currentActual;
                    const pct = planned > 0 ? ((currentActual / planned) * 100).toFixed(0) : '0';
                    return (
                      <>
                        <div className="flex justify-between text-slate-300">
                          <span>Cumplimiento:</span>
                          <span className="font-bold">{pct}%</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Disponible restante:</span>
                          <span className={diff >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {formatMoney(diff, settings.currencySymbol)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-700">
                          <span className="text-slate-400">Diagnóstico:</span>
                          <span className={diff >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {diff >= 0 ? '✓ Ahorro / En rango' : '⚠️ Sobregiro'}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nota o avance (opcional)
                </label>
                <input
                  type="text"
                  value={executionNote}
                  onChange={(e) => setExecutionNote(e.target.value)}
                  placeholder="Ej. Compra de suministros miércoles de semana 1"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExecutionModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  Guardar Avance Real
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Movement Modal */}
      {isNewMovementOpen && (
        <QuickMovementModal
          isOpen={isNewMovementOpen}
          onClose={() => setIsNewMovementOpen(false)}
        />
      )}
    </div>
  );
};
