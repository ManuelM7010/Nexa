import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Edit2,
  CalendarDays,
  Split,
  Trash2,
  Plus,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { DailyCashFlowItem, Transaction } from '../../types';
import { formatMoney, getTodayDateString, addDays } from '../../services/financialEngine';
import { QuickMovementModal } from '../common/QuickMovementModal';

export const DailyCashFlowView: React.FC = () => {
  const {
    dailyTimeline,
    selectedYearMonth,
    settings,
    toggleTransactionStatus,
    updateTransaction,
    deleteTransaction,
    addTransaction,
  } = useFinancial();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_movements' | 'critical' | 'upcoming'>('all');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Filter daily items for the current selected month + search/filter
  const monthItems = useMemo(() => {
    return dailyTimeline.filter((item) => {
      // Must match selected month
      const matchesMonth = item.date.startsWith(selectedYearMonth);
      if (!matchesMonth) return false;

      // Filter by type
      if (filterType === 'with_movements' && item.transactions.length === 0) return false;
      if (filterType === 'critical' && item.liquidityStatus === 'healthy') return false;
      if (filterType === 'upcoming' && item.date < todayStr) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDate = item.date.includes(query);
        const matchesConcept = item.transactions.some(
          (t) =>
            t.concept.toLowerCase().includes(query) ||
            (t.note && t.note.toLowerCase().includes(query))
        );
        return matchesDate || matchesConcept;
      }

      return true;
    });
  }, [dailyTimeline, selectedYearMonth, filterType, searchQuery, todayStr]);

  // Postpone movement helper (+N days)
  const handlePostpone = async (tx: Transaction, daysToAdd: number) => {
    const newDate = addDays(tx.date, daysToAdd);
    await updateTransaction({
      ...tx,
      date: newDate,
      expectedDate: newDate,
      note: `${tx.note ? tx.note + ' | ' : ''}Postergado +${daysToAdd}d`,
    });
  };

  // Split movement into 2 installments
  const handleSplit = async (tx: Transaction) => {
    const half1 = Math.floor(tx.amountCents / 2);
    const half2 = tx.amountCents - half1;

    // Update original to half 1
    await updateTransaction({
      ...tx,
      concept: `${tx.concept} (Parte 1/2)`,
      amountCents: half1,
    });

    // Add second half in 15 days
    await addTransaction({
      concept: `${tx.concept} (Parte 2/2)`,
      amountCents: half2,
      date: addDays(tx.date, 15),
      expectedDate: addDays(tx.date, 15),
      type: tx.type,
      categoryId: tx.categoryId,
      status: 'planned',
      accountId: tx.accountId,
      creditCardId: tx.creditCardId,
      note: 'Generado al dividir movimiento',
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* View Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Flujo de Caja Diario ({selectedYearMonth})
          </h2>
          <p className="text-xs text-slate-400">
            Evolución del saldo disponible día tras día con análisis de liquidez en tiempo real
          </p>
        </div>

        {/* Quick Filter Buttons & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar movimiento..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-48"
            />
          </div>

          <div className="flex rounded-xl bg-slate-900 p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('with_movements')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'with_movements'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Con movimientos
            </button>
            <button
              onClick={() => setFilterType('critical')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'critical' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ajustado/Riesgo
            </button>
          </div>
        </div>
      </div>

      {/* Daily Timeline Table / Cards List */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm">
        {/* Table Header for medium+ screens */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2">Fecha / Día</div>
          <div className="col-span-2 text-right">Saldo Inicial</div>
          <div className="col-span-2 text-right">Ingresos</div>
          <div className="col-span-2 text-right">Gastos / Obligaciones</div>
          <div className="col-span-2 text-right">Saldo Final Proyectado</div>
          <div className="col-span-2 text-center">Estado de Liquidez</div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {monthItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No hay días con movimientos que coincidan con los filtros aplicados en {selectedYearMonth}.
            </div>
          ) : (
            monthItems.map((item) => {
              const isToday = item.date === todayStr;
              const isExpanded = expandedDate === item.date;
              const hasMovements = item.transactions.length > 0;

              return (
                <div
                  key={item.date}
                  className={`transition-colors ${
                    isToday ? 'bg-blue-950/20' : isExpanded ? 'bg-slate-800/30' : 'hover:bg-slate-850/50'
                  }`}
                >
                  {/* Row content */}
                  <div
                    onClick={() => setExpandedDate(isExpanded ? null : item.date)}
                    className="p-3.5 md:px-4 md:py-3 cursor-pointer flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-3 items-start md:items-center text-xs"
                  >
                    {/* Date / Day Indicator */}
                    <div className="col-span-2 flex items-center justify-between w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono-nums font-bold ${
                            isToday ? 'text-blue-400' : 'text-white'
                          }`}
                        >
                          {item.date}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                            HOY
                          </span>
                        )}
                      </div>
                      <div className="md:hidden flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.liquidityStatus === 'danger'
                              ? 'bg-rose-500/20 text-rose-400'
                              : item.liquidityStatus === 'tight'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {item.liquidityStatus === 'danger'
                            ? 'Riesgo'
                            : item.liquidityStatus === 'tight'
                            ? 'Ajustado'
                            : 'Saludable'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Initial Balance */}
                    <div className="col-span-2 hidden md:block text-right font-mono-nums text-slate-400">
                      {formatMoney(item.initialBalanceCents, settings.currencySymbol)}
                    </div>

                    {/* Incomes */}
                    <div className="col-span-2 flex md:block justify-between w-full md:w-auto text-right font-mono-nums">
                      <span className="md:hidden text-slate-400 text-[11px]">Ingresos:</span>
                      <span
                        className={
                          item.totalIncomeCents > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'
                        }
                      >
                        {item.totalIncomeCents > 0
                          ? `+${formatMoney(item.totalIncomeCents, settings.currencySymbol)}`
                          : '-'}
                      </span>
                    </div>

                    {/* Expenses & Obligations */}
                    <div className="col-span-2 flex md:block justify-between w-full md:w-auto text-right font-mono-nums">
                      <span className="md:hidden text-slate-400 text-[11px]">Gastos / Obligaciones:</span>
                      <span
                        className={
                          item.totalExpenseCents > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'
                        }
                      >
                        {item.totalExpenseCents > 0
                          ? `-${formatMoney(item.totalExpenseCents, settings.currencySymbol)}`
                          : '-'}
                      </span>
                    </div>

                    {/* Final Projected Balance */}
                    <div className="col-span-2 flex md:block justify-between w-full md:w-auto text-right font-mono-nums">
                      <span className="md:hidden text-slate-300 font-semibold text-[11px]">
                        Saldo Proyectado:
                      </span>
                      <span
                        className={`font-bold text-sm ${
                          item.finalBalanceCents < 0
                            ? 'text-rose-400'
                            : item.liquidityStatus === 'tight'
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}
                      >
                        {formatMoney(item.finalBalanceCents, settings.currencySymbol)}
                      </span>
                    </div>

                    {/* Liquidity Status (Desktop) */}
                    <div className="col-span-2 hidden md:flex items-center justify-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.liquidityStatus === 'danger'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : item.liquidityStatus === 'tight'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {item.liquidityStatus === 'danger' ? (
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                        ) : item.liquidityStatus === 'tight' ? (
                          <Clock className="w-3 h-3 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>
                          {item.liquidityStatus === 'danger'
                            ? 'Riesgo / Negativo'
                            : item.liquidityStatus === 'tight'
                            ? 'Ajustado'
                            : 'Saludable'}
                        </span>
                      </span>
                      {hasMovements && (
                        <span className="text-slate-500 text-[10px]">
                          ({item.transactions.length})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel (Prompt #6) */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800/80 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/60">
                        <span className="font-semibold text-slate-300">
                          Movimientos detallados para el {item.date}:
                        </span>
                        <button
                          onClick={() => setIsNewMovementOpen(true)}
                          className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar a este día</span>
                        </button>
                      </div>

                      {item.transactions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">
                          No hay movimientos registrados ni proyectados en este día.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {item.transactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                            >
                              <div className="flex items-start gap-2.5">
                                <button
                                  onClick={() =>
                                    toggleTransactionStatus(
                                      tx.id,
                                      tx.status === 'completed' ? 'planned' : 'completed'
                                    )
                                  }
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer flex-shrink-0 mt-0.5 ${
                                    tx.status === 'completed'
                                      ? 'bg-emerald-600 border-emerald-500 text-white'
                                      : 'border-slate-600 hover:border-slate-400'
                                  }`}
                                  title={
                                    tx.status === 'completed'
                                      ? 'Marcar como planificado'
                                      : 'Marcar como realizado'
                                  }
                                >
                                  {tx.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                </button>

                                <div>
                                  <div className="font-bold text-white flex items-center gap-2">
                                    <span
                                      className={tx.status === 'completed' ? 'line-through text-slate-400' : ''}
                                    >
                                      {tx.concept}
                                    </span>
                                    {tx.isGenerated && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        Proyectado
                                      </span>
                                    )}
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                        tx.status === 'completed'
                                          ? 'bg-emerald-500/10 text-emerald-400'
                                          : tx.status === 'planned'
                                          ? 'bg-blue-500/10 text-blue-400'
                                          : 'bg-slate-700 text-slate-300'
                                      }`}
                                    >
                                      {tx.status === 'completed'
                                        ? 'Realizado'
                                        : tx.status === 'planned'
                                        ? 'Planificado'
                                        : 'Cancelado'}
                                    </span>
                                  </div>
                                  {tx.note && <div className="text-[11px] text-slate-400 mt-0.5">{tx.note}</div>}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                                <span
                                  className={`font-mono-nums font-bold text-sm ${
                                    tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                                  }`}
                                >
                                  {tx.type === 'income' ? '+' : '-'}
                                  {formatMoney(tx.amountCents, settings.currencySymbol)}
                                </span>

                                {/* Context Action Buttons: Edit, Postpone, Split, Delete */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setEditingTx(tx)}
                                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
                                    title="Editar monto o fecha"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handlePostpone(tx, 3)}
                                    className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-slate-800 transition cursor-pointer"
                                    title="Postergar +3 días"
                                  >
                                    <CalendarDays className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleSplit(tx)}
                                    className="p-1 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-800 transition cursor-pointer"
                                    title="Dividir en 2 cuotas"
                                  >
                                    <Split className="w-3.5 h-3.5" />
                                  </button>
                                  {!tx.isGenerated && (
                                    <button
                                      onClick={() => deleteTransaction(tx.id)}
                                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition cursor-pointer"
                                      title="Eliminar movimiento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
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

      {/* Edit modal */}
      {editingTx && (
        <QuickMovementModal
          isOpen={true}
          editingTransaction={editingTx}
          onClose={() => setEditingTx(null)}
        />
      )}

      {/* Add new modal */}
      <QuickMovementModal
        isOpen={isNewMovementOpen}
        onClose={() => setIsNewMovementOpen(false)}
      />
    </div>
  );
};
