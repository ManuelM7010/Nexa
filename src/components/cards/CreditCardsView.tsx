import React, { useState, useMemo } from 'react';
import {
  CreditCard as CardIcon,
  Plus,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Calendar,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { CreditCard as ICreditCard } from '../../types';
import { formatMoney, toCents, centsToInputString, getTodayDateString } from '../../services/financialEngine';

export const CreditCardsView: React.FC = () => {
  const {
    creditCards,
    accounts,
    accountBalances,
    settings,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addTransaction,
  } = useFinancial();

  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<ICreditCard | null>(null);

  // Pay card modal state
  const [payingCard, setPayingCard] = useState<ICreditCard | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [payFromAccountId, setPayFromAccountId] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());

  // Form states for new/edit card
  const [cardName, setCardName] = useState('');
  const [bank, setBank] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [usedInput, setUsedInput] = useState('');
  const [closingDay, setClosingDay] = useState('20');
  const [dueDay, setDueDay] = useState('15');

  const openNewCard = () => {
    setEditingCard(null);
    setCardName('');
    setBank('');
    setLimitInput('1500');
    setUsedInput('0');
    setClosingDay('20');
    setDueDay('15');
    setIsNewCardModalOpen(true);
  };

  const openEditCard = (card: ICreditCard) => {
    setEditingCard(card);
    setCardName(card.name);
    setBank(card.bank);
    setLimitInput(centsToInputString(card.creditLimitCents));
    setUsedInput(centsToInputString(card.currentUsedBalanceCents));
    setClosingDay(card.statementClosingDay.toString());
    setDueDay(card.paymentDueDay.toString());
    setIsNewCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitCents = toCents(limitInput);
    const usedCents = toCents(usedInput);

    if (editingCard) {
      await updateCreditCard({
        ...editingCard,
        name: cardName.trim(),
        bank: bank.trim(),
        creditLimitCents: limitCents,
        currentUsedBalanceCents: usedCents,
        statementClosingDay: parseInt(closingDay, 10),
        paymentDueDay: parseInt(dueDay, 10),
      });
    } else {
      await addCreditCard({
        name: cardName.trim(),
        bank: bank.trim(),
        creditLimitCents: limitCents,
        currentUsedBalanceCents: usedCents,
        statementClosingDay: parseInt(closingDay, 10),
        paymentDueDay: parseInt(dueDay, 10),
        color: '#DC2626',
        active: true,
      });
    }
    setIsNewCardModalOpen(false);
  };

  // Open Pay Card modal
  const openPayCardModal = (card: ICreditCard) => {
    setPayingCard(card);
    setPaymentAmountInput(centsToInputString(card.currentUsedBalanceCents));
    setPayFromAccountId(accounts[0]?.id || '');
    setPaymentDate(getTodayDateString());
  };

  // Compute payment impact (Prompt #21)
  const paymentAmountCents = useMemo(() => toCents(paymentAmountInput), [paymentAmountInput]);
  const selectedPayAccount = useMemo(() => {
    return accounts.find((a) => a.id === payFromAccountId);
  }, [accounts, payFromAccountId]);

  const selectedPayAccountBalance = useMemo(() => {
    if (!selectedPayAccount) return 0;
    return accountBalances[selectedPayAccount.id] ?? selectedPayAccount.initialBalanceCents;
  }, [selectedPayAccount, accountBalances]);

  const accountBalanceAfterPayment = selectedPayAccountBalance - paymentAmountCents;

  const handleExecuteCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCard || paymentAmountCents <= 0 || !payFromAccountId) return;

    // Add transaction of type 'credit_card_payment'
    await addTransaction({
      concept: `Pago de Tarjeta: ${payingCard.name}`,
      amountCents: paymentAmountCents,
      date: paymentDate,
      expectedDate: paymentDate,
      type: 'credit_card_payment',
      categoryId: 'cat_other_exp',
      status: 'completed',
      accountId: payFromAccountId,
      creditCardId: payingCard.id,
      note: `Liquidación de saldo utilizado (${paymentDate})`,
    });

    setPayingCard(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <CardIcon className="w-5 h-5 text-blue-400" />
            Tarjetas de Crédito y Deudas
          </h2>
          <p className="text-xs text-slate-400">
            Control de límites, saldos utilizados, fechas de corte y pagos con simulación de impacto
          </p>
        </div>

        <button
          onClick={openNewCard}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Tarjeta</span>
        </button>
      </div>

      {/* Credit Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {creditCards.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-900 border border-slate-800">
            No tienes tarjetas de crédito registradas. Haz clic en "Registrar Tarjeta" para agregar una.
          </div>
        ) : (
          creditCards.map((card) => {
            const availableCents = Math.max(0, card.creditLimitCents - card.currentUsedBalanceCents);
            const utilizationPercent =
              card.creditLimitCents > 0
                ? (card.currentUsedBalanceCents / card.creditLimitCents) * 100
                : 0;
            const isHighUtilization = utilizationPercent >= 70;
            const isModerateUtilization = utilizationPercent >= 50 && utilizationPercent < 70;

            return (
              <div
                key={card.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-sm hover:border-slate-700 transition"
              >
                {/* Top card banner */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {card.bank}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      {card.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditCard(card)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Editar datos de tarjeta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCreditCard(card.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                      title="Eliminar tarjeta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Utilization Alert (Prompt #22) */}
                {isHighUtilization && (
                  <div className="rounded-xl bg-rose-950/50 border border-rose-500/30 p-2.5 flex items-center gap-2 text-xs text-rose-200">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>
                      Alerta: Saldo utilizado supera el <strong>70%</strong> del límite de crédito.
                    </span>
                  </div>
                )}
                {isModerateUtilization && (
                  <div className="rounded-xl bg-amber-950/50 border border-amber-500/30 p-2.5 flex items-center gap-2 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>Uso superior al 50% del límite asignado.</span>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Saldo Utilizado (Deuda)</span>
                    <div className="text-base font-extrabold font-mono-nums text-rose-400 mt-0.5">
                      {formatMoney(card.currentUsedBalanceCents, settings.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Crédito Disponible</span>
                    <div className="text-base font-extrabold font-mono-nums text-emerald-400 mt-0.5">
                      {formatMoney(availableCents, settings.currencySymbol)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-400 font-mono-nums">
                    <span>Límite total: {formatMoney(card.creditLimitCents, settings.currencySymbol)}</span>
                    <span className="font-bold">{utilizationPercent.toFixed(1)}% ocupado</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isHighUtilization
                          ? 'bg-rose-500'
                          : isModerateUtilization
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Closing & Payment Days */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Corte día: <strong>{card.statementClosingDay}</strong></span>
                  </div>
                  <div>
                    <span>Pago límite día: <strong>{card.paymentDueDay}</strong></span>
                  </div>
                </div>

                {/* Pay Card CTA */}
                <button
                  onClick={() => openPayCardModal(card)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Registrar Pago a Tarjeta</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Register / Edit Credit Card */}
      {isNewCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingCard ? 'Editar Tarjeta' : 'Registrar Tarjeta de Crédito'}
              </h3>
              <button
                onClick={() => setIsNewCardModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nombre de la Tarjeta *</label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Ej: Tarjeta BAC Black, Visa Oro..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Banco Emisor *</label>
                <input
                  type="text"
                  required
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="Ej: BAC Credomatic, Banco X..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Límite de Crédito *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Saldo Actual Utilizado *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={usedInput}
                    onChange={(e) => setUsedInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Día de Corte (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Día Límite de Pago (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {editingCard ? 'Guardar Cambios' : 'Registrar Tarjeta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Pay Card with Liquidity Simulation (Prompt #21) */}
      {payingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Pagar Tarjeta: {payingCard.name}
              </h3>
              <button
                onClick={() => setPayingCard(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteCardPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cuenta de Origen para el Pago</label>
                <select
                  value={payFromAccountId}
                  onChange={(e) => setPayFromAccountId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — Saldo: {formatMoney(accountBalances[acc.id] ?? acc.initialBalanceCents, settings.currencySymbol)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Monto a Pagar</label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmountInput(centsToInputString(payingCard.currentUsedBalanceCents))}
                    className="text-[11px] text-blue-400 hover:underline cursor-pointer font-medium"
                  >
                    Pago Total ({formatMoney(payingCard.currentUsedBalanceCents, settings.currencySymbol)})
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-7 pr-3 py-2 font-mono-nums font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Fecha del Pago</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Dynamic Simulation Box (Prompt #21) */}
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 space-y-2 text-slate-300">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Simulación de Impacto en Liquidez:
                </div>
                <p className="text-xs leading-relaxed">
                  Pagar <strong>{formatMoney(paymentAmountCents, settings.currencySymbol)}</strong> de la tarjeta{' '}
                  <span className="text-white font-semibold">{payingCard.name}</span> el día {paymentDate} dejará la cuenta{' '}
                  <span className="text-white font-semibold">{selectedPayAccount?.name}</span> con un saldo de:{' '}
                  <strong
                    className={`font-mono-nums ${
                      accountBalanceAfterPayment < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatMoney(accountBalanceAfterPayment, settings.currencySymbol)}
                  </strong>
                  .
                </p>
                {accountBalanceAfterPayment < 0 && (
                  <div className="text-rose-400 text-[11px] font-bold flex items-center gap-1.5 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Advertencia: Esta operación dejaría la cuenta en saldo negativo.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingCard(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
