import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  Calendar,
  Wallet,
  DollarSign,
  TrendingDown,
  Trash2,
  Edit2,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { Loan } from '../../types';
import { formatMoney, toCents, centsToInputString, getTodayDateString } from '../../services/financialEngine';

export const LoansView: React.FC = () => {
  const {
    loans,
    accounts,
    accountBalances,
    settings,
    addLoan,
    updateLoan,
    deleteLoan,
    makeLoanPayment,
  } = useFinancial();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  // Abono extraordinario / Pago modal state
  const [activeLoanPayment, setActiveLoanPayment] = useState<Loan | null>(null);
  const [paymentType, setPaymentType] = useState<'regular' | 'extraordinary_capital'>('extraordinary_capital');
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [payFromAccountId, setPayFromAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [paymentNote, setPaymentNote] = useState('');

  // Form states for Loan creation/edit
  const [name, setName] = useState('');
  const [originalAmountInput, setOriginalAmountInput] = useState('5000');
  const [pendingAmountInput, setPendingAmountInput] = useState('3200');
  const [installmentAmountInput, setInstallmentAmountInput] = useState('180');
  const [paymentDay, setPaymentDay] = useState('28');
  const [totalInstallments, setTotalInstallments] = useState('36');
  const [paidInstallments, setPaidInstallments] = useState('10');
  const [fromAccountId, setFromAccountId] = useState('');
  const [note, setNote] = useState('');

  const openNew = () => {
    setEditingLoan(null);
    setName('');
    setOriginalAmountInput('5000');
    setPendingAmountInput('3200');
    setInstallmentAmountInput('180');
    setPaymentDay('28');
    setTotalInstallments('36');
    setPaidInstallments('10');
    setFromAccountId(accounts[0]?.id || '');
    setNote('');
    setIsModalOpen(true);
  };

  const openEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setName(loan.name);
    setOriginalAmountInput(centsToInputString(loan.originalAmountCents));
    setPendingAmountInput(centsToInputString(loan.currentPendingBalanceCents));
    setInstallmentAmountInput(centsToInputString(loan.installmentAmountCents));
    setPaymentDay(loan.paymentDay.toString());
    setTotalInstallments(loan.totalInstallmentsCount.toString());
    setPaidInstallments(loan.paidInstallmentsCount.toString());
    setFromAccountId(loan.fromAccountId || '');
    setNote(loan.note || '');
    setIsModalOpen(true);
  };

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    const origCents = toCents(originalAmountInput);
    const pendCents = toCents(pendingAmountInput);
    const instCents = toCents(installmentAmountInput);
    const day = parseInt(paymentDay, 10) || 1;
    const totalInst = parseInt(totalInstallments, 10) || 1;
    const paidInst = parseInt(paidInstallments, 10) || 0;

    const nextDate = `${getTodayDateString().slice(0, 7)}-${String(day).padStart(2, '0')}`;

    if (editingLoan) {
      await updateLoan({
        ...editingLoan,
        name: name.trim(),
        originalAmountCents: origCents,
        currentPendingBalanceCents: pendCents,
        installmentAmountCents: instCents,
        paymentDay: day,
        nextPaymentDate: nextDate,
        totalInstallmentsCount: totalInst,
        paidInstallmentsCount: paidInst,
        fromAccountId: fromAccountId || undefined,
        note: note.trim() || undefined,
      });
    } else {
      await addLoan({
        name: name.trim(),
        originalAmountCents: origCents,
        currentPendingBalanceCents: pendCents,
        installmentAmountCents: instCents,
        frequency: 'monthly',
        paymentDay: day,
        nextPaymentDate: nextDate,
        totalInstallmentsCount: totalInst,
        paidInstallmentsCount: paidInst,
        fromAccountId: fromAccountId || undefined,
        note: note.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  // Open Payment modal
  const openPaymentModal = (loan: Loan, type: 'regular' | 'extraordinary_capital') => {
    setActiveLoanPayment(loan);
    setPaymentType(type);
    setPaymentAmountInput(
      type === 'regular'
        ? centsToInputString(loan.installmentAmountCents)
        : '500.00'
    );
    setPayFromAccountId(loan.fromAccountId || accounts[0]?.id || '');
    setPaymentDate(getTodayDateString());
    setPaymentNote(type === 'extraordinary_capital' ? 'Abono extraordinario a capital' : 'Pago regular de cuota');
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoanPayment) return;
    const amountCents = toCents(paymentAmountInput);
    if (amountCents <= 0) return;

    await makeLoanPayment(
      activeLoanPayment.id,
      amountCents,
      paymentType,
      paymentDate,
      payFromAccountId || undefined,
      paymentNote
    );

    setActiveLoanPayment(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-400" />
            Control de Préstamos y Deudas Bancarias
          </h2>
          <p className="text-xs text-slate-400">
            Seguimiento de saldo insoluto, cuotas regulares y amortizaciones extraordinarias a capital
          </p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Préstamo</span>
        </button>
      </div>

      {/* Loans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loans.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-900 border border-slate-800">
            No tienes préstamos registrados. Haz clic en "Registrar Préstamo" para agregar uno.
          </div>
        ) : (
          loans.map((loan) => {
            const fromAccount = accounts.find((a) => a.id === loan.fromAccountId);
            const remainingInstallments = Math.max(0, loan.totalInstallmentsCount - loan.paidInstallmentsCount);
            const progressPercent =
              loan.originalAmountCents > 0
                ? ((loan.originalAmountCents - loan.currentPendingBalanceCents) / loan.originalAmountCents) * 100
                : 0;

            return (
              <div
                key={loan.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-sm hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Préstamo
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      {loan.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(loan)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteLoan(loan.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Saldo Pendiente Actual</span>
                    <div className="text-base font-extrabold font-mono-nums text-rose-400 mt-0.5">
                      {formatMoney(loan.currentPendingBalanceCents, settings.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Cuota Mensual</span>
                    <div className="text-base font-extrabold font-mono-nums text-white mt-0.5">
                      {formatMoney(loan.installmentAmountCents, settings.currencySymbol)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>
                      {loan.paidInstallmentsCount} de {loan.totalInstallmentsCount} cuotas ({remainingInstallments} pendientes)
                    </span>
                    <span className="font-bold text-emerald-400 font-mono-nums">
                      {progressPercent.toFixed(1)}% amortizado
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                    />
                  </div>
                </div>

                {/* Extra info */}
                <div className="text-xs text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between">
                  <span>Monto original: {formatMoney(loan.originalAmountCents, settings.currencySymbol)}</span>
                  <span>Día de pago: <strong>{loan.paymentDay}</strong></span>
                </div>

                {/* Action Buttons: Pagar cuota / Abono a capital */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => openPaymentModal(loan, 'regular')}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer border border-slate-700 text-center"
                  >
                    Pagar Cuota
                  </button>
                  <button
                    onClick={() => openPaymentModal(loan, 'extraordinary_capital')}
                    className="py-2 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-emerald-600/20 text-center flex items-center justify-center gap-1.5"
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Abono a Capital</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Register / Edit Loan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingLoan ? 'Editar Préstamo' : 'Registrar Préstamo'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nombre o Concepto *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Préstamo Auto, Hipoteca, Crédito Personal..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Monto Original *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={originalAmountInput}
                    onChange={(e) => setOriginalAmountInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Saldo Actual Pendiente *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={pendingAmountInput}
                    onChange={(e) => setPendingAmountInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Valor de la Cuota *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={installmentAmountInput}
                    onChange={(e) => setInstallmentAmountInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Día de Pago (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={paymentDay}
                    onChange={(e) => setPaymentDay(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Total de Cuotas</label>
                  <input
                    type="number"
                    min="1"
                    value={totalInstallments}
                    onChange={(e) => setTotalInstallments(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Cuotas Ya Pagadas</label>
                  <input
                    type="number"
                    min="0"
                    value={paidInstallments}
                    onChange={(e) => setPaidInstallments(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Cuenta de Débito (Opcional)</label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Sin débito automático asignado</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.bankName || 'Efectivo'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nota o Referencia</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Detalles sobre tasa o condiciones"
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
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
                  {editingLoan ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Payment / Abono a Capital (Prompt #26) */}
      {activeLoanPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                {paymentType === 'extraordinary_capital' ? 'Abono Extraordinario a Capital' : 'Pago de Cuota'}
              </h3>
              <button
                onClick={() => setActiveLoanPayment(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400">Préstamo: <strong>{activeLoanPayment.name}</strong></div>
                <div className="text-slate-400 font-mono-nums">
                  Saldo pendiente actual: <strong>{formatMoney(activeLoanPayment.currentPendingBalanceCents, settings.currencySymbol)}</strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tipo de Operación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('regular');
                      setPaymentAmountInput(centsToInputString(activeLoanPayment.installmentAmountCents));
                    }}
                    className={`py-2 rounded-xl font-semibold transition cursor-pointer text-center ${
                      paymentType === 'regular'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Cuota Regular ({formatMoney(activeLoanPayment.installmentAmountCents, settings.currencySymbol)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('extraordinary_capital');
                    }}
                    className={`py-2 rounded-xl font-semibold transition cursor-pointer text-center ${
                      paymentType === 'extraordinary_capital'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Abono a Capital
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Monto del Abono *</label>
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
                <label className="block font-semibold text-slate-300 mb-1">Cuenta de Débito</label>
                <select
                  value={payFromAccountId}
                  onChange={(e) => setPayFromAccountId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Sin registro de movimiento en cuenta</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Saldo: {formatMoney(accountBalances[a.id] ?? a.initialBalanceCents, settings.currencySymbol)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Fecha de la Operación</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveLoanPayment(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  Aplicar Operación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
