import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  Search,
  Filter,
  Plus,
  Copy,
  Edit2,
  Trash2,
  CheckCircle2,
  Calendar,
  Split,
  CalendarDays,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { Transaction, MovementType, MovementStatus } from '../../types';
import { formatMoney, addDays, getTodayDateString } from '../../services/financialEngine';
import { QuickMovementModal } from '../common/QuickMovementModal';

export const MovementsView: React.FC = () => {
  const {
    allTransactionsCombined,
    selectedYearMonth,
    categories,
    accounts,
    creditCards,
    settings,
    toggleTransactionStatus,
    duplicateTransaction,
    deleteTransaction,
    updateTransaction,
    addTransaction,
    exportMovementsCSV,
  } = useFinancial();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MovementStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | string>('all');

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);

  // Filtered movements
  const filteredTransactions = useMemo(() => {
    return allTransactionsCombined.filter((tx) => {
      // Month check
      if (!tx.date.startsWith(selectedYearMonth)) return false;

      // Status check
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

      // Type check
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Account check
      if (accountFilter !== 'all') {
        const matchesAcc = tx.accountId === accountFilter || tx.creditCardId === accountFilter;
        if (!matchesAcc) return false;
      }

      // Search check
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesConcept = tx.concept.toLowerCase().includes(q);
        const matchesNote = tx.note?.toLowerCase().includes(q);
        const matchesDate = tx.date.includes(q);
        if (!matchesConcept && !matchesNote && !matchesDate) return false;
      }

      return true;
    });
  }, [allTransactionsCombined, selectedYearMonth, statusFilter, typeFilter, accountFilter, search]);

  // Aggregate monthly totals for the filtered view
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((tx) => {
      if (tx.status === 'cancelled') return;
      if (tx.type === 'income') income += tx.amountCents;
      if (tx.type === 'expense' || tx.type === 'credit_card_payment' || tx.type === 'loan_payment') {
        expense += tx.amountCents;
      }
    });
    return {
      income,
      expense,
      net: income - expense,
    };
  }, [filteredTransactions]);

  // Postpone helper
  const handlePostpone = async (tx: Transaction, days: number) => {
    const nextDate = addDays(tx.date, days);
    await updateTransaction({
      ...tx,
      date: nextDate,
      expectedDate: nextDate,
      note: `${tx.note ? tx.note + ' | ' : ''}Postergado +${days}d`,
    });
  };

  // Split helper
  const handleSplit = async (tx: Transaction) => {
    const half1 = Math.floor(tx.amountCents / 2);
    const half2 = tx.amountCents - half1;

    await updateTransaction({
      ...tx,
      concept: `${tx.concept} (1/2)`,
      amountCents: half1,
    });

    await addTransaction({
      concept: `${tx.concept} (2/2)`,
      amountCents: half2,
      date: addDays(tx.date, 15),
      expectedDate: addDays(tx.date, 15),
      type: tx.type,
      categoryId: tx.categoryId,
      status: 'planned',
      accountId: tx.accountId,
      creditCardId: tx.creditCardId,
      note: 'Generado al dividir',
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            Movimientos ({selectedYearMonth})
          </h2>
          <p className="text-xs text-slate-400">
            Registro, control y edición dinámica de todos tus ingresos, gastos y obligaciones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportMovementsCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            title="Descargar lista de movimientos en formato CSV compatible con Excel"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsNewMovementOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
            Total Ingresos
          </div>
          <div className="text-lg font-bold font-mono-nums text-emerald-400 mt-1">
            +{formatMoney(totals.income, settings.currencySymbol)}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
            Total Gastos y Obligaciones
          </div>
          <div className="text-lg font-bold font-mono-nums text-rose-400 mt-1">
            -{formatMoney(totals.expense, settings.currencySymbol)}
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5">
          <div className="text-[11px] font-semibold text-slate-400">Balance Neto</div>
          <div
            className={`text-lg font-bold font-mono-nums mt-1 ${
              totals.net >= 0 ? 'text-blue-400' : 'text-rose-400'
            }`}
          >
            {formatMoney(totals.net, settings.currencySymbol)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar concepto o nota..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-850 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="rounded-xl bg-slate-850 border border-slate-700 px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Todos los tipos</option>
            <option value="expense">Gastos</option>
            <option value="income">Ingresos</option>
            <option value="credit_card_payment">Pago de Tarjeta</option>
            <option value="loan_payment">Pago de Préstamo</option>
            <option value="transfer">Transferencias</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl bg-slate-850 border border-slate-700 px-3 py-1.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="planned">Planificados</option>
            <option value="completed">Realizados</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        <div className="text-[11px] text-slate-400 font-mono-nums">
          {filteredTransactions.length} movimientos
        </div>
      </div>

      {/* Movements Table / List */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-slate-800/80">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No se encontraron movimientos registrados en {selectedYearMonth} con los filtros seleccionados.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const category = categories.find((c) => c.id === tx.categoryId);
              const account = accounts.find((a) => a.id === tx.accountId);
              const card = creditCards.find((c) => c.id === tx.creditCardId);

              return (
                <div
                  key={tx.id}
                  className="p-3.5 hover:bg-slate-850/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Checkbox + Concept + Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
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
                      title={tx.status === 'completed' ? 'Marcar como planificado' : 'Confirmar como realizado'}
                    >
                      {tx.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                    </button>

                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-bold text-white truncate ${
                            tx.status === 'completed' ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {tx.concept}
                        </span>

                        {tx.isGenerated && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Proyectado
                          </span>
                        )}

                        {tx.isUnbudgeted && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            ⚠️ Imprevisto
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            tx.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : tx.status === 'planned'
                              ? 'bg-blue-500/10 text-blue-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {tx.status === 'completed'
                            ? 'Realizado'
                            : tx.status === 'planned'
                            ? 'Planificado'
                            : 'Cancelado'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span className="font-mono-nums flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {tx.date}
                        </span>

                        {category && <span>• {category.name}</span>}

                        {account && <span>• {account.name}</span>}

                        {card && <span className="text-amber-400/90">• {card.name}</span>}

                        {tx.note && <span className="italic text-slate-500">• {tx.note}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <div
                      className={`font-extrabold font-mono-nums text-sm ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatMoney(tx.amountCents, settings.currencySymbol)}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingTx(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        title="Editar movimiento"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => duplicateTransaction(tx.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Duplicar movimiento"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handlePostpone(tx, 3)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Postergar +3 días"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleSplit(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition cursor-pointer"
                        title="Dividir en 2"
                      >
                        <Split className="w-3.5 h-3.5" />
                      </button>

                      {!tx.isGenerated && (
                        <button
                          onClick={() => deleteTransaction(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Eliminar movimiento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
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
