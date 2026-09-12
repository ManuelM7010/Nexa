import React, { useState, useMemo } from 'react';
import {
  CreditCard as CardIcon,
  Calendar,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { CreditCard, Transaction, InstallmentPurchase } from '../../types';
import { formatMoney } from '../../services/financialEngine';

export const CardStatementsView: React.FC = () => {
  const {
    creditCards,
    allTransactionsCombined,
    installmentPurchases,
    subscriptions,
    selectedYearMonth,
    settings,
  } = useFinancial();

  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || '');
  const [reconciledIds, setReconciledIds] = useState<Record<string, boolean>>({});

  const activeCard = useMemo(() => {
    return creditCards.find((c) => c.id === selectedCardId) || creditCards[0];
  }, [creditCards, selectedCardId]);

  // Compute statement date range for the active card for the selected month
  // E.g. If closing day is 20: Cycle is from 21st of previous month to 20th of current month
  const statementRange = useMemo(() => {
    if (!activeCard) return { startDate: '', endDate: '', dueDate: '' };

    const [yearStr, monthStr] = selectedYearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12

    const closeDay = Math.min(28, activeCard.statementClosingDay);
    const dueDay = Math.min(28, activeCard.paymentDueDay);

    // Current cycle end date
    const endDate = `${selectedYearMonth}-${String(closeDay).padStart(2, '0')}`;

    // Previous cycle end + 1 day = start date
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const startDay = closeDay === 31 ? 1 : closeDay + 1;
    const startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;

    // Payment due date (usually in next month or days after close)
    const dueMonth = dueDay < closeDay ? (month === 12 ? 1 : month + 1) : month;
    const dueYear = dueDay < closeDay && month === 12 ? year + 1 : year;
    const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

    return { startDate, endDate, dueDate };
  }, [activeCard, selectedYearMonth]);

  // Transactions belonging to this card in this statement cycle
  const cardTransactions = useMemo(() => {
    if (!activeCard) return [];
    return allTransactionsCombined.filter((t) => {
      if (t.creditCardId !== activeCard.id) return false;
      const txDate = t.date || t.expectedDate || '';
      return txDate >= statementRange.startDate && txDate <= statementRange.endDate;
    });
  }, [allTransactionsCombined, activeCard, statementRange]);

  // Installment quotas billed this cycle for this card
  const activeInstallments = useMemo(() => {
    if (!activeCard) return [];
    return installmentPurchases.filter((p) => p.creditCardId === activeCard.id && p.remainingInstallmentsCount > 0);
  }, [installmentPurchases, activeCard]);

  // Subscriptions charged to this card
  const cardSubscriptions = useMemo(() => {
    if (!activeCard) return [];
    return subscriptions.filter((s) => s.paymentMethodId === activeCard.id && s.active);
  }, [subscriptions, activeCard]);

  // Calculations
  const purchasesTotalCents = useMemo(() => {
    return cardTransactions
      .filter((t) => t.type !== 'credit_card_payment')
      .reduce((acc, t) => acc + t.amountCents, 0);
  }, [cardTransactions]);

  const paymentsTotalCents = useMemo(() => {
    return cardTransactions
      .filter((t) => t.type === 'credit_card_payment')
      .reduce((acc, t) => acc + t.amountCents, 0);
  }, [cardTransactions]);

  const installmentsTotalCents = useMemo(() => {
    return activeInstallments.reduce((acc, p) => acc + p.installmentValueCents, 0);
  }, [activeInstallments]);

  // Total statement balance to pay to avoid interest
  const statementBalanceCents = activeCard?.currentUsedBalanceCents || (purchasesTotalCents + installmentsTotalCents - paymentsTotalCents);
  const minimumPaymentCents = Math.max(500, Math.round(statementBalanceCents * 0.05)); // 5% minimum
  const availableCreditCents = activeCard ? Math.max(0, activeCard.creditLimitCents - activeCard.currentUsedBalanceCents) : 0;

  const toggleReconciliation = (id: string) => {
    setReconciledIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (!activeCard) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
        No tienes tarjetas registradas para generar estados de cuenta. Agrega una desde la pestaña de Tarjetas o Catálogos.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Card Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <CardIcon className="w-5 h-5 text-blue-400" />
            Estados de Cuenta de Tarjetas de Crédito
          </h2>
          <p className="text-xs text-slate-400">
            Resumen de corte, conciliación de cargos, cuotas mensuales y fechas de pago por tarjeta
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Card Selector */}
          <select
            value={selectedCardId}
            onChange={(e) => setSelectedCardId(e.target.value)}
            aria-label="Seleccionar tarjeta de crédito"
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
          >
            {creditCards.map((c) => (
              <option key={c.id} value={c.id}>
                💳 {c.name} ({c.bank})
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Official Bank Statement Style Container */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden print:border-none print:shadow-none">
        {/* Statement Header Banner */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <CardIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {activeCard.bank}
                </span>
                <h3 className="text-xl font-black text-white">{activeCard.name}</h3>
                <p className="text-xs text-slate-400">
                  Período de facturación: <strong className="text-slate-200">{statementRange.startDate}</strong> al <strong className="text-slate-200">{statementRange.endDate}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-right">
              <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Fecha de Corte
                </span>
                <span className="text-sm font-bold text-white font-mono-nums">
                  {statementRange.endDate} (Día {activeCard.statementClosingDay})
                </span>
              </div>
              <div className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-500/30">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                  Fecha Límite de Pago
                </span>
                <span className="text-sm font-extrabold text-rose-300 font-mono-nums">
                  {statementRange.dueDate} (Día {activeCard.paymentDueDay})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statement Financial Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-800 bg-slate-950/60 text-xs">
          <div className="p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Saldo Total a Pagar (No Intereses)</span>
            <div className="text-xl font-black font-mono-nums text-white">
              {formatMoney(statementBalanceCents, settings.currencySymbol)}
            </div>
            <span className="text-[10px] text-slate-500">Liquidación total del período</span>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Pago Mínimo Estimado</span>
            <div className="text-xl font-black font-mono-nums text-amber-400">
              {formatMoney(minimumPaymentCents, settings.currencySymbol)}
            </div>
            <span className="text-[10px] text-slate-500">5% sugerido para no mora</span>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Límite de Crédito Autorizado</span>
            <div className="text-xl font-black font-mono-nums text-slate-300">
              {formatMoney(activeCard.creditLimitCents, settings.currencySymbol)}
            </div>
            <span className="text-[10px] text-slate-500">Cupo total asignado</span>
          </div>

          <div className="p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Crédito Disponible Actual</span>
            <div className="text-xl font-black font-mono-nums text-emerald-400">
              {formatMoney(availableCreditCents, settings.currencySymbol)}
            </div>
            <span className="text-[10px] text-slate-500">
              {activeCard.creditLimitCents > 0
                ? `${((availableCreditCents / activeCard.creditLimitCents) * 100).toFixed(1)}% disponible`
                : '100%'}
            </span>
          </div>
        </div>

        {/* Charges Breakdown Section */}
        <div className="p-6 space-y-6">
          {/* Section 1: Purchases and Direct Movements in Period */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                <span>Movimientos y Cargos del Ciclo ({cardTransactions.length})</span>
              </h4>
              <span className="text-xs font-mono font-bold text-slate-300">
                Total Cargos: {formatMoney(purchasesTotalCents, settings.currencySymbol)}
              </span>
            </div>

            {cardTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No hay transacciones registradas para esta tarjeta dentro de este ciclo de facturación.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/60 rounded-xl bg-slate-950/40 border border-slate-800 overflow-hidden">
                {cardTransactions.map((tx) => {
                  const isReconciled = !!reconciledIds[tx.id];
                  const isPayment = tx.type === 'credit_card_payment';

                  return (
                    <div
                      key={tx.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-850/40 transition text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleReconciliation(tx.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center transition cursor-pointer ${
                            isReconciled
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-800 border border-slate-700 text-transparent hover:text-slate-400'
                          }`}
                          title="Conciliar cargo con estado de cuenta físico"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            <span>{tx.concept}</span>
                            {isPayment && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                                Abono / Pago
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono-nums">
                            Fecha de operación: {tx.date}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono-nums">
                        <span
                          className={`font-bold ${
                            isPayment ? 'text-emerald-400' : 'text-slate-100'
                          }`}
                        >
                          {isPayment ? '-' : '+'}
                          {formatMoney(tx.amountCents, settings.currencySymbol)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Installment Purchases Billed to this Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Cuotas de Compras a Plazos Facturadas en este Corte ({activeInstallments.length})</span>
              </h4>
              <span className="text-xs font-mono font-bold text-purple-300">
                Cuota mensual agregada: {formatMoney(installmentsTotalCents, settings.currencySymbol)}
              </span>
            </div>

            {activeInstallments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No hay compras a plazos vigentes imputadas a esta tarjeta.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeInstallments.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-100">{item.concept}</span>
                      <div className="text-[10px] text-slate-400">
                        Cuota {item.paidInstallmentsCount + 1} de {item.totalInstallments} ({item.remainingInstallmentsCount} pendientes)
                      </div>
                    </div>
                    <div className="text-right font-mono-nums">
                      <span className="font-bold text-purple-400">
                        {formatMoney(item.installmentValueCents, settings.currencySymbol)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Subscriptions Associated with this Card */}
          {cardSubscriptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Suscripciones Domiciliadas a esta Tarjeta ({cardSubscriptions.length})</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {cardSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{sub.concept}</span>
                      <span className="text-[10px] text-slate-400 block">Cobra el día {sub.billingDay}</span>
                    </div>
                    <span className="font-bold font-mono-nums text-slate-100">
                      {formatMoney(sub.amountCents, settings.currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
