import React, { useState } from 'react';
import {
  Tv,
  Plus,
  Play,
  Pause,
  Calendar,
  CreditCard,
  Wallet,
  Clock,
  Trash2,
  Edit2,
  X,
  AlertCircle,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { Subscription } from '../../types';
import { formatMoney, toCents, centsToInputString } from '../../services/financialEngine';

export const SubscriptionsView: React.FC = () => {
  const {
    subscriptions,
    creditCards,
    accounts,
    categories,
    selectedYearMonth,
    settings,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    toggleSubscriptionPause,
    setSubscriptionMonthException,
  } = useFinancial();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  // Exception modal state (Prompt #28)
  const [exceptionSub, setExceptionSub] = useState<Subscription | null>(null);
  const [isPausedThisMonth, setIsPausedThisMonth] = useState(false);
  const [overrideAmountInput, setOverrideAmountInput] = useState('');
  const [exceptionNote, setExceptionNote] = useState('');

  // Form states
  const [concept, setConcept] = useState('');
  const [amountInput, setAmountInput] = useState('12.00');
  const [billingDay, setBillingDay] = useState('15');
  const [paymentMethodType, setPaymentMethodType] = useState<'credit_card' | 'account'>('credit_card');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [categoryId, setCategoryId] = useState('cat_subscriptions');

  const openNew = () => {
    setEditingSub(null);
    setConcept('');
    setAmountInput('12.00');
    setBillingDay('15');
    setPaymentMethodType('credit_card');
    setPaymentMethodId(creditCards[0]?.id || '');
    setCategoryId('cat_subscriptions');
    setIsModalOpen(true);
  };

  const openEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setConcept(sub.concept);
    setAmountInput(centsToInputString(sub.amountCents));
    setBillingDay(sub.billingDay.toString());
    setPaymentMethodType(sub.paymentMethodType);
    setPaymentMethodId(sub.paymentMethodId);
    setCategoryId(sub.categoryId);
    setIsModalOpen(true);
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = toCents(amountInput);
    const day = parseInt(billingDay, 10) || 1;

    if (editingSub) {
      await updateSubscription({
        ...editingSub,
        concept: concept.trim(),
        amountCents,
        billingDay: day,
        paymentMethodType,
        paymentMethodId,
        categoryId,
      });
    } else {
      await addSubscription({
        concept: concept.trim(),
        amountCents,
        billingDay: day,
        frequency: 'monthly',
        paymentMethodType,
        paymentMethodId,
        categoryId,
        status: 'active',
      });
    }

    setIsModalOpen(false);
  };

  // Open Month Exception Modal (Prompt #28)
  const openExceptionModal = (sub: Subscription) => {
    setExceptionSub(sub);
    const existing = sub.exceptionsByMonth?.[selectedYearMonth];
    if (existing) {
      setIsPausedThisMonth(existing.paused === true);
      setOverrideAmountInput(
        existing.overrideAmountCents !== undefined
          ? centsToInputString(existing.overrideAmountCents)
          : ''
      );
      setExceptionNote(existing.note || '');
    } else {
      setIsPausedThisMonth(false);
      setOverrideAmountInput('');
      setExceptionNote('');
    }
  };

  const handleSaveException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionSub) return;

    await setSubscriptionMonthException(exceptionSub.id, selectedYearMonth, {
      paused: isPausedThisMonth,
      overrideAmountCents: overrideAmountInput ? toCents(overrideAmountInput) : undefined,
      note: exceptionNote.trim() || undefined,
    });

    setExceptionSub(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Tv className="w-5 h-5 text-blue-400" />
            Suscripciones y Apps Recurrentes
          </h2>
          <p className="text-xs text-slate-400">
            Control de cobros mensuales y excepciones por mes específico (ej: pausar en diciembre sin alterar enero)
          </p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Suscripción</span>
        </button>
      </div>

      {/* Resumen Ejecutivo Separado de Suscripciones */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Gasto Mensual en Suscripciones</span>
          <div className="text-xl font-bold font-mono text-white">
            {formatMoney(
              subscriptions.reduce((acc, s) => {
                const exc = s.exceptionsByMonth?.[selectedYearMonth];
                if (exc?.paused || s.status === 'paused') return acc;
                return acc + (exc?.overrideAmountCents ?? s.amountCents);
              }, 0),
              settings.currencySymbol
            )}
          </div>
          <span className="text-[10px] text-slate-500">Costo recurrente en {selectedYearMonth}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Proyección Anual Total</span>
          <div className="text-xl font-bold font-mono text-indigo-400">
            {formatMoney(
              subscriptions.filter((s) => s.status === 'active').reduce((acc, s) => acc + s.amountCents, 0) * 12,
              settings.currencySymbol
            )}
          </div>
          <span className="text-[10px] text-slate-500">Impacto a 12 meses vista</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Suscripciones Activas</span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {subscriptions.filter((s) => s.status === 'active').length}
            <span className="text-xs text-slate-500 font-normal ml-1">
              / {subscriptions.length} totales
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {subscriptions.filter((s) => s.status === 'paused').length} en pausa
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Mayor Suscripción</span>
          <div className="text-sm font-bold text-slate-200 truncate mt-1">
            {subscriptions.length > 0
              ? [...subscriptions].sort((a, b) => b.amountCents - a.amountCents)[0].concept
              : 'Ninguna'}
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {subscriptions.length > 0
              ? formatMoney([...subscriptions].sort((a, b) => b.amountCents - a.amountCents)[0].amountCents, settings.currencySymbol)
              : '$0'}
          </span>
        </div>
      </div>

      {/* Subscriptions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subscriptions.length === 0 ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-900 border border-slate-800">
            No tienes suscripciones registradas. Haz clic en "Agregar Suscripción" para comenzar.
          </div>
        ) : (
          subscriptions.map((sub) => {
            const card = creditCards.find((c) => c.id === sub.paymentMethodId);
            const account = accounts.find((a) => a.id === sub.paymentMethodId);
            const exception = sub.exceptionsByMonth?.[selectedYearMonth];
            const isPausedForMonth = exception?.paused ?? sub.status === 'paused';
            const effectiveAmount =
              isPausedForMonth
                ? 0
                : exception?.overrideAmountCents !== undefined
                ? exception.overrideAmountCents
                : sub.amountCents;

            return (
              <div
                key={sub.id}
                className={`rounded-2xl bg-slate-900/90 border p-5 space-y-4 shadow-sm transition ${
                  isPausedForMonth ? 'border-amber-500/30 opacity-80' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Día {sub.billingDay} de cada mes
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      {sub.concept}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(sub)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSubscription(sub.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Amount Box */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">Cobro en {selectedYearMonth}</span>
                    <div
                      className={`text-lg font-extrabold font-mono-nums mt-0.5 ${
                        isPausedForMonth ? 'text-slate-500 line-through' : 'text-white'
                      }`}
                    >
                      {formatMoney(effectiveAmount, settings.currencySymbol)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPausedForMonth
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {isPausedForMonth ? 'Pausado este mes' : 'Activo'}
                    </span>
                    {exception && (
                      <div className="text-[10px] text-blue-400 mt-1">Excepción aplicada</div>
                    )}
                  </div>
                </div>

                {/* Payment Method Badge */}
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  {sub.paymentMethodType === 'credit_card' ? (
                    <>
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{card?.name || 'Tarjeta de Crédito'}</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-3.5 h-3.5 text-blue-400" />
                      <span>{account?.name || 'Cuenta Bancaria'}</span>
                    </>
                  )}
                </div>

                {/* Actions: Pause globally vs Month Exception */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => toggleSubscriptionPause(sub.id)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {sub.status === 'active' ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Reanudar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openExceptionModal(sub)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold transition cursor-pointer border border-blue-500/30 text-center"
                    title="Configurar regla especial para este mes"
                  >
                    Excepción {selectedYearMonth.slice(5)}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Create / Edit Subscription */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingSub ? 'Editar Suscripción' : 'Nueva Suscripción'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSub} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nombre / Servicio *</label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: Spotify Familiar, Netflix 4K, iCloud..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Monto Mensual *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Día de Cobro (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={billingDay}
                    onChange={(e) => setBillingDay(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Medio de Pago</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethodType('credit_card');
                      setPaymentMethodId(creditCards[0]?.id || '');
                    }}
                    className={`py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                      paymentMethodType === 'credit_card'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Tarjeta de Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethodType('account');
                      setPaymentMethodId(accounts[0]?.id || '');
                    }}
                    className={`py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                      paymentMethodType === 'account'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Cuenta Bancaria
                  </button>
                </div>

                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {paymentMethodType === 'credit_card'
                    ? creditCards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.bank})
                        </option>
                      ))
                    : accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.bankName || 'Banco'})
                        </option>
                      ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {editingSub ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Month Specific Exception (Prompt #28) */}
      {exceptionSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Excepción para {exceptionSub.concept} ({selectedYearMonth})
              </h3>
              <button
                onClick={() => setExceptionSub(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveException} className="space-y-3.5 text-xs">
              <p className="text-slate-400 leading-relaxed">
                Aplica ajustes específicos para <strong>{selectedYearMonth}</strong> sin modificar los meses posteriores.
              </p>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPausedThisMonth}
                  onChange={(e) => setIsPausedThisMonth(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                />
                <span className="font-semibold text-white">
                  Pausar suscripción únicamente en {selectedYearMonth} ($0)
                </span>
              </label>

              {!isPausedThisMonth && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Monto personalizado para este mes (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={overrideAmountInput}
                    onChange={(e) => setOverrideAmountInput(e.target.value)}
                    placeholder={centsToInputString(exceptionSub.amountCents)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Motivo / Nota</label>
                <input
                  type="text"
                  value={exceptionNote}
                  onChange={(e) => setExceptionNote(e.target.value)}
                  placeholder="Ej: Pausado por vacaciones..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setExceptionSub(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Guardar Excepción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
