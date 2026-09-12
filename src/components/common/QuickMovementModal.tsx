import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  PlusCircle,
  ArrowRight,
  CreditCard as CardIcon,
  Wallet,
  ArrowLeftRight,
  Layers,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { MovementType, MovementStatus, Transaction } from '../../types';
import { formatMoney, toCents, centsToInputString, getTodayDateString } from '../../services/financialEngine';

interface QuickMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  defaultIsUnbudgeted?: boolean;
}

export const QuickMovementModal: React.FC<QuickMovementModalProps> = ({
  isOpen,
  onClose,
  editingTransaction,
  defaultIsUnbudgeted = false,
}) => {
  const {
    accounts,
    creditCards,
    categories,
    accountBalances,
    settings,
    addTransaction,
    updateTransaction,
  } = useFinancial();

  const [type, setType] = useState<MovementType>('expense');
  const [concept, setConcept] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<MovementStatus>('planned');
  const [note, setNote] = useState<string>('');
  const [isUnbudgeted, setIsUnbudgeted] = useState<boolean>(false);

  // Payment method selection
  const [paymentMode, setPaymentMode] = useState<'account' | 'credit_card'>('account');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>(''); // for transfers

  // When opening in edit mode or fresh mode
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setConcept(editingTransaction.concept);
      setAmountInput(centsToInputString(editingTransaction.amountCents));
      setDate(editingTransaction.date);
      setExpectedDate(editingTransaction.expectedDate || '');
      setCategoryId(editingTransaction.categoryId || '');
      setStatus(editingTransaction.status);
      setNote(editingTransaction.note || '');
      setIsUnbudgeted(!!editingTransaction.isUnbudgeted);

      if (editingTransaction.creditCardId) {
        setPaymentMode('credit_card');
        setSelectedCreditCardId(editingTransaction.creditCardId);
      } else {
        setPaymentMode('account');
        setSelectedAccountId(editingTransaction.accountId || (accounts[0]?.id ?? ''));
      }
      if (editingTransaction.toAccountId) {
        setToAccountId(editingTransaction.toAccountId);
      }
    } else {
      // Reset to defaults
      setType('expense');
      setConcept('');
      setAmountInput('');
      setDate(getTodayDateString());
      setExpectedDate('');
      setStatus('planned');
      setNote('');
      setIsUnbudgeted(defaultIsUnbudgeted);

      const defaultCat = categories.find((c) => c.type === 'expense');
      if (defaultCat) setCategoryId(defaultCat.id);

      const defaultAcc = accounts[0];
      if (defaultAcc) {
        setSelectedAccountId(defaultAcc.id);
      }
      if (creditCards[0]) {
        setSelectedCreditCardId(creditCards[0].id);
      }
      if (accounts[1]) {
        setToAccountId(accounts[1].id);
      }
    }
  }, [editingTransaction, isOpen, accounts, creditCards, categories]);

  // Amount in cents
  const amountCents = useMemo(() => toCents(amountInput), [amountInput]);

  // Selected account details
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const selectedAccountBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    return accountBalances[selectedAccount.id] ?? selectedAccount.initialBalanceCents;
  }, [selectedAccount, accountBalances]);

  // Selected card details
  const selectedCard = useMemo(() => {
    return creditCards.find((c) => c.id === selectedCreditCardId);
  }, [creditCards, selectedCreditCardId]);

  // Dynamic context preview
  const accountBalanceAfter = useMemo(() => {
    if (type === 'income') return selectedAccountBalance + amountCents;
    if (type === 'expense' || type === 'credit_card_payment' || type === 'loan_payment') {
      return selectedAccountBalance - amountCents;
    }
    if (type === 'transfer') return selectedAccountBalance - amountCents;
    return selectedAccountBalance;
  }, [type, selectedAccountBalance, amountCents]);

  const cardAvailableBefore = useMemo(() => {
    if (!selectedCard) return 0;
    return Math.max(0, selectedCard.creditLimitCents - selectedCard.currentUsedBalanceCents);
  }, [selectedCard]);

  const cardAvailableAfter = useMemo(() => {
    if (!selectedCard) return 0;
    if (type === 'expense') {
      return Math.max(0, cardAvailableBefore - amountCents);
    }
    if (type === 'credit_card_payment') {
      return Math.min(selectedCard.creditLimitCents, cardAvailableBefore + amountCents);
    }
    return cardAvailableBefore;
  }, [selectedCard, cardAvailableBefore, type, amountCents]);

  const cardUsedAfter = useMemo(() => {
    if (!selectedCard) return 0;
    if (type === 'expense') {
      return selectedCard.currentUsedBalanceCents + amountCents;
    }
    if (type === 'credit_card_payment') {
      return Math.max(0, selectedCard.currentUsedBalanceCents - amountCents);
    }
    return selectedCard.currentUsedBalanceCents;
  }, [selectedCard, type, amountCents]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || amountCents <= 0) return;

    if (editingTransaction) {
      await updateTransaction({
        ...editingTransaction,
        concept: concept.trim(),
        amountCents,
        date,
        expectedDate: expectedDate || date,
        type,
        categoryId: categoryId || 'cat_other_exp',
        status,
        isUnbudgeted: type === 'expense' ? isUnbudgeted : false,
        note: note.trim() || undefined,
        accountId: paymentMode === 'account' ? selectedAccountId : undefined,
        creditCardId: paymentMode === 'credit_card' ? selectedCreditCardId : undefined,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
      });
    } else {
      await addTransaction({
        concept: concept.trim(),
        amountCents,
        date,
        expectedDate: expectedDate || date,
        type,
        categoryId: categoryId || (type === 'income' ? 'cat_salary' : 'cat_other_exp'),
        status,
        isUnbudgeted: type === 'expense' ? isUnbudgeted : false,
        note: note.trim() || undefined,
        accountId: paymentMode === 'account' ? selectedAccountId : undefined,
        creditCardId: paymentMode === 'credit_card' ? selectedCreditCardId : undefined,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 flex flex-col gap-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {editingTransaction ? 'Editar Movimiento' : 'Nuevo Movimiento'}
              </h3>
              <p className="text-xs text-slate-400">
                Registra ingresos, gastos, transferencias o pagos de obligaciones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Movement Type Pill Selector */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">Tipo de Movimiento</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setPaymentMode('account');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer text-center ${
                  type === 'expense'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setPaymentMode('account');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer text-center ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('transfer');
                  setPaymentMode('account');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer text-center ${
                  type === 'transfer'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Transferencia
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('credit_card_payment');
                  setPaymentMode('account');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer text-center ${
                  type === 'credit_card_payment'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pago Tarjeta
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('loan_payment');
                  setPaymentMode('account');
                }}
                className={`py-1.5 px-2 rounded-lg font-semibold transition cursor-pointer text-center ${
                  type === 'loan_payment'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Préstamo
              </button>
            </div>
          </div>

          {/* Concept & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Concepto *</label>
              <input
                type="text"
                required
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Supermercado, Alquiler, Salario..."
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Monto ({settings.currency}) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-bold text-slate-400">{settings.currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-7 pr-3 py-2 font-mono-nums font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Dates & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Fecha Efectiva</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Fecha Esperada</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-2.5 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MovementStatus)}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="planned">Planificado (Futuro)</option>
                <option value="completed">Realizado (Efectuado)</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Payment Method / Account / Credit Card Selector */}
          <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Medio de Pago / Cuenta</span>
              {type === 'expense' && creditCards.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('account')}
                    className={`px-2 py-0.5 rounded ${
                      paymentMode === 'account'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cuenta/Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('credit_card')}
                    className={`px-2 py-0.5 rounded ${
                      paymentMode === 'credit_card'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tarjeta de Crédito
                  </button>
                </div>
              )}
            </div>

            {/* Standard Bank / Cash Account Selector */}
            {paymentMode === 'account' && (
              <div className="space-y-2">
                <div>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type === 'cash' ? 'Efectivo' : acc.bankName || 'Banco'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* TRANSFER: destination account */}
                {type === 'transfer' && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Cuenta Destino</label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {accounts
                        .filter((a) => a.id !== selectedAccountId)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.bankName || 'Cuenta'})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* CREDIT CARD PAYMENT: target card */}
                {type === 'credit_card_payment' && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Tarjeta a Pagar</label>
                    <select
                      value={selectedCreditCardId}
                      onChange={(e) => setSelectedCreditCardId(e.target.value)}
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      {creditCards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name} (Utilizado: {formatMoney(card.currentUsedBalanceCents, settings.currencySymbol)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dynamic Contextual Account Box (Prompt Requirement #40) */}
                {selectedAccount && (
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>
                        {selectedAccount.type === 'cash' ? 'Efectivo disponible actual:' : 'Saldo bancario actual:'}
                      </span>
                      <span className="font-bold font-mono-nums text-slate-200">
                        {formatMoney(selectedAccountBalance, settings.currencySymbol)}
                      </span>
                    </div>
                    {amountCents > 0 && (
                      <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800/60 font-medium">
                        <span>Saldo tras el movimiento:</span>
                        <span
                          className={`font-bold font-mono-nums ${
                            accountBalanceAfter < 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {formatMoney(accountBalanceAfter, settings.currencySymbol)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Credit Card Direct Purchase Mode (Prompt Requirement #40) */}
            {paymentMode === 'credit_card' && (
              <div className="space-y-2">
                <select
                  value={selectedCreditCardId}
                  onChange={(e) => setSelectedCreditCardId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name} ({card.bank}) — Límite: {formatMoney(card.creditLimitCents, settings.currencySymbol)}
                    </option>
                  ))}
                </select>

                {selectedCard && (
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 p-2.5 text-[11px] space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Crédito disponible antes:</span>
                      <span className="font-bold font-mono-nums text-slate-200">
                        {formatMoney(cardAvailableBefore, settings.currencySymbol)}
                      </span>
                    </div>
                    {amountCents > 0 && (
                      <>
                        <div className="flex justify-between text-slate-300">
                          <span>Crédito disponible después:</span>
                          <span
                            className={`font-bold font-mono-nums ${
                              cardAvailableAfter <= 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {formatMoney(cardAvailableAfter, settings.currencySymbol)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                          <span>Saldo utilizado resultante:</span>
                          <span className="font-bold font-mono-nums text-amber-400">
                            {formatMoney(cardUsedAfter, settings.currencySymbol)}
                          </span>
                        </div>
                        <p className="text-[10px] text-blue-400/90 italic pt-0.5">
                          ℹ️ Esta compra incrementa la deuda de tu tarjeta sin restar dinero inmediato de tu cuenta bancaria.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Category & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {categories
                  .filter((c) => (type === 'income' ? c.type === 'income' : c.type === 'expense'))
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">Comentario / Nota</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Detalles adicionales opcionales"
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Unbudgeted expense flag */}
          {type === 'expense' && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="space-y-0.5">
                <label
                  htmlFor="isUnbudgetedToggle"
                  className="text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Gasto fuera de presupuesto / Imprevisto
                </label>
                <p className="text-[11px] text-slate-400">
                  Marca este movimiento si no estaba planeado en tu presupuesto mensual para analizar desviaciones.
                </p>
              </div>
              <input
                type="checkbox"
                id="isUnbudgetedToggle"
                checked={isUnbudgeted}
                onChange={(e) => setIsUnbudgeted(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer ml-3"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              {editingTransaction ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
