import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  X,
  Wallet,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatMoney, getDaysInMonth, getFirstDayOfMonth, getTodayDateString } from '../../services/financialEngine';
import { QuickMovementModal } from '../common/QuickMovementModal';
import { Transaction } from '../../types';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const CalendarView: React.FC = () => {
  const {
    selectedYear,
    selectedMonth,
    setSelectedYearMonth,
    selectedYearMonth,
    dailyTimeline,
    allTransactionsCombined,
    settings,
    toggleTransactionStatus,
  } = useFinancial();

  const [selectedDayDate, setSelectedDayDate] = useState<string>(getTodayDateString());
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);

  // Month days layout
  const daysInMonth = useMemo(() => getDaysInMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const firstDay = useMemo(() => getFirstDayOfMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  // Convert Sunday=0 to Monday=0: (day + 6) % 7
  const startOffset = (firstDay + 6) % 7;

  // Selected day data
  const selectedDayItem = useMemo(() => {
    return dailyTimeline.find((d) => d.date === selectedDayDate);
  }, [dailyTimeline, selectedDayDate]);

  const selectedDayTransactions = useMemo(() => {
    return allTransactionsCombined.filter((t) => t.date === selectedDayDate);
  }, [allTransactionsCombined, selectedDayDate]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-400" />
            Calendario Financiero ({selectedYearMonth})
          </h2>
          <p className="text-xs text-slate-400">
            Vista integral de vencimientos, ingresos y evolución de saldo por día
          </p>
        </div>

        <button
          onClick={() => setIsNewMovementOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar en {selectedDayDate}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Calendar Grid */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 pb-2 border-b border-slate-800">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Blank leading days */}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-[72px] rounded-xl bg-slate-950/20 opacity-30" />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const dayDaily = dailyTimeline.find((d) => d.date === dateStr);
              const isSelected = selectedDayDate === dateStr;
              const isToday = dateStr === getTodayDateString();

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDayDate(dateStr)}
                  className={`min-h-[72px] rounded-xl p-1.5 border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500'
                      : isToday
                      ? 'bg-slate-850/80 border-blue-500/50'
                      : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold font-mono-nums ${
                        isToday ? 'text-blue-400 font-extrabold' : 'text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dayDaily && dayDaily.transactions.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    )}
                  </div>

                  {/* Day balance & tags preview */}
                  <div className="space-y-0.5 mt-1">
                    {dayDaily && dayDaily.totalIncomeCents > 0 && (
                      <div className="text-[9px] font-mono-nums font-bold text-emerald-400 truncate">
                        +{formatMoney(dayDaily.totalIncomeCents, settings.currencySymbol)}
                      </div>
                    )}
                    {dayDaily && dayDaily.totalExpenseCents > 0 && (
                      <div className="text-[9px] font-mono-nums font-bold text-rose-400 truncate">
                        -{formatMoney(dayDaily.totalExpenseCents, settings.currencySymbol)}
                      </div>
                    )}
                    {dayDaily && (
                      <div
                        className={`text-[10px] font-mono-nums font-bold truncate pt-0.5 border-t border-slate-800/60 ${
                          dayDaily.finalBalanceCents < 0 ? 'text-rose-400' : 'text-slate-200'
                        }`}
                      >
                        {formatMoney(dayDaily.finalBalanceCents, settings.currencySymbol)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Selected Day Inspector (Prompt #18) */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Detalle del Día</h3>
                <span className="text-xs font-mono-nums font-bold text-blue-400">{selectedDayDate}</span>
              </div>
              <button
                onClick={() => setIsNewMovementOpen(true)}
                className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                title="Agregar movimiento a este día"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Daily balance summary */}
            {selectedDayItem && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Saldo Inicial</span>
                  <div className="font-mono-nums font-bold text-white mt-0.5">
                    {formatMoney(selectedDayItem.initialBalanceCents, settings.currencySymbol)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px]">Saldo Final Proyectado</span>
                  <div
                    className={`font-mono-nums font-bold mt-0.5 ${
                      selectedDayItem.finalBalanceCents < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatMoney(selectedDayItem.finalBalanceCents, settings.currencySymbol)}
                  </div>
                </div>
              </div>
            )}

            {/* List of transactions for this day */}
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-300">
                Movimientos y Obligaciones ({selectedDayTransactions.length}):
              </h4>

              {selectedDayTransactions.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-4 text-center rounded-xl bg-slate-950/40 border border-slate-800/60">
                  No hay movimientos registrados para el {selectedDayDate}.
                </p>
              ) : (
                selectedDayTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() =>
                          toggleTransactionStatus(
                            tx.id,
                            tx.status === 'completed' ? 'planned' : 'completed'
                          )
                        }
                        className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                          tx.status === 'completed'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {tx.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <div className="truncate">
                        <div
                          className={`font-semibold text-white truncate ${
                            tx.status === 'completed' ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {tx.concept}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {tx.status === 'completed' ? 'Realizado' : 'Planificado'}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-mono-nums font-bold flex-shrink-0 ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatMoney(tx.amountCents, settings.currencySymbol)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <QuickMovementModal
        isOpen={isNewMovementOpen}
        onClose={() => setIsNewMovementOpen(false)}
      />
    </div>
  );
};
