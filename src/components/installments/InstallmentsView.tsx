import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Calendar,
  CreditCard as CardIcon,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { InstallmentPurchase } from '../../types';
import { formatMoney, toCents, centsToInputString, getTodayDateString } from '../../services/financialEngine';

export const InstallmentsView: React.FC = () => {
  const {
    installmentPurchases,
    creditCards,
    settings,
    addInstallmentPurchase,
    updateInstallmentPurchase,
    deleteInstallmentPurchase,
  } = useFinancial();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InstallmentPurchase | null>(null);

  // Form states
  const [concept, setConcept] = useState('');
  const [totalAmountInput, setTotalAmountInput] = useState('600');
  const [cardId, setCardId] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [installmentValueInput, setInstallmentValueInput] = useState('50');
  const [firstPaymentDate, setFirstPaymentDate] = useState(getTodayDateString());
  const [paidCount, setPaidCount] = useState('0');
  const [note, setNote] = useState('');

  const openNew = () => {
    setEditingItem(null);
    setConcept('');
    setTotalAmountInput('600');
    setCardId(creditCards[0]?.id || '');
    setTotalInstallments('12');
    setInstallmentValueInput('50');
    setFirstPaymentDate(getTodayDateString());
    setPaidCount('0');
    setNote('');
    setIsModalOpen(true);
  };

  const openEdit = (item: InstallmentPurchase) => {
    setEditingItem(item);
    setConcept(item.concept);
    setTotalAmountInput(centsToInputString(item.totalAmountCents));
    setCardId(item.creditCardId);
    setTotalInstallments(item.totalInstallments.toString());
    setInstallmentValueInput(centsToInputString(item.installmentValueCents));
    setFirstPaymentDate(item.firstPaymentDate);
    setPaidCount(item.paidInstallmentsCount.toString());
    setNote(item.note || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmountCents = toCents(totalAmountInput);
    const installmentValueCents = toCents(installmentValueInput);
    const totalInst = parseInt(totalInstallments, 10) || 1;
    const paid = parseInt(paidCount, 10) || 0;
    const remaining = Math.max(0, totalInst - paid);

    if (editingItem) {
      await updateInstallmentPurchase({
        ...editingItem,
        concept: concept.trim(),
        totalAmountCents,
        creditCardId: cardId,
        totalInstallments: totalInst,
        installmentValueCents,
        firstPaymentDate,
        paidInstallmentsCount: paid,
        remainingInstallmentsCount: remaining,
        note: note.trim() || undefined,
      });
    } else {
      await addInstallmentPurchase({
        concept: concept.trim(),
        purchaseDate: getTodayDateString(),
        totalAmountCents,
        creditCardId: cardId,
        totalInstallments: totalInst,
        installmentValueCents,
        firstPaymentDate,
        frequency: 'monthly',
        paidInstallmentsCount: paid,
        remainingInstallmentsCount: remaining,
        note: note.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  // Recalculate installment value when total amount or installments count change
  const handleAutoCalcInstallment = (total: string, count: string) => {
    const totalCents = toCents(total);
    const num = parseInt(count, 10);
    if (num > 0) {
      setInstallmentValueInput((totalCents / 100 / num).toFixed(2));
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            Compras a Cuotas (Tarjetas)
          </h2>
          <p className="text-xs text-slate-400">
            Seguimiento de compras a meses sin intereses y compromisos en cuotas fijas
          </p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Compra a Cuotas</span>
        </button>
      </div>

      {/* Resumen Ejecutivo Separado de Compras a Cuotas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Cuota Mensual Comprometida</span>
          <div className="text-xl font-bold font-mono text-purple-400">
            {formatMoney(
              installmentPurchases
                .filter((p) => p.remainingInstallmentsCount > 0)
                .reduce((acc, p) => acc + p.installmentValueCents, 0),
              settings.currencySymbol
            )}
          </div>
          <span className="text-[10px] text-slate-500">Impacto mensual en flujo de caja</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Deuda Total Pendiente en Cuotas</span>
          <div className="text-xl font-bold font-mono text-white">
            {formatMoney(
              installmentPurchases.reduce(
                (acc, p) => acc + p.remainingInstallmentsCount * p.installmentValueCents,
                0
              ),
              settings.currencySymbol
            )}
          </div>
          <span className="text-[10px] text-slate-500">Saldo insoluto acumulado</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Compras a Plazos Activas</span>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {installmentPurchases.filter((p) => p.remainingInstallmentsCount > 0).length}
            <span className="text-xs text-slate-500 font-normal ml-1">
              / {installmentPurchases.length} registradas
            </span>
          </div>
          <span className="text-[10px] text-slate-500">
            {installmentPurchases.filter((p) => p.remainingInstallmentsCount === 0).length} finalizadas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-semibold text-slate-400">Próxima a Liquidarse</span>
          <div className="text-sm font-bold text-slate-200 truncate mt-1">
            {installmentPurchases.filter((p) => p.remainingInstallmentsCount > 0).length > 0
              ? [...installmentPurchases.filter((p) => p.remainingInstallmentsCount > 0)].sort(
                  (a, b) => a.remainingInstallmentsCount - b.remainingInstallmentsCount
                )[0].concept
              : 'Ninguna'}
          </div>
          <span className="text-[10px] font-mono text-purple-300">
            {installmentPurchases.filter((p) => p.remainingInstallmentsCount > 0).length > 0
              ? `Faltan solo ${
                  [...installmentPurchases.filter((p) => p.remainingInstallmentsCount > 0)].sort(
                    (a, b) => a.remainingInstallmentsCount - b.remainingInstallmentsCount
                  )[0].remainingInstallmentsCount
                } cuotas`
              : 'Sin cuotas'}
          </span>
        </div>
      </div>

      {/* Grid of Purchases */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {installmentPurchases.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-900 border border-slate-800">
            No tienes compras a cuotas registradas. Haz clic en "Registrar Compra a Cuotas" para agregar una.
          </div>
        ) : (
          installmentPurchases.map((item) => {
            const card = creditCards.find((c) => c.id === item.creditCardId);
            const progressPercent = (item.paidInstallmentsCount / item.totalInstallments) * 100;
            const remainingDebtCents = item.remainingInstallmentsCount * item.installmentValueCents;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-sm hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                      {card?.name || 'Tarjeta de Crédito'}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      {item.concept}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteInstallmentPurchase(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status Pills */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Cuota Mensual</span>
                    <div className="text-base font-extrabold font-mono-nums text-white mt-0.5">
                      {formatMoney(item.installmentValueCents, settings.currencySymbol)}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Saldo Pendiente</span>
                    <div className="text-base font-extrabold font-mono-nums text-amber-400 mt-0.5">
                      {formatMoney(remainingDebtCents, settings.currencySymbol)}
                    </div>
                  </div>
                </div>

                {/* Progress bar and counter */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold">
                      Cuota {item.paidInstallmentsCount} de {item.totalInstallments} pagadas
                    </span>
                    <span className="text-slate-400 font-mono-nums font-bold">
                      {item.remainingInstallmentsCount} restantes
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span>Monto Total: {formatMoney(item.totalAmountCents, settings.currencySymbol)}</span>
                  <span>1er Pago: {item.firstPaymentDate}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingItem ? 'Editar Compra a Cuotas' : 'Registrar Compra a Cuotas'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Concepto o Producto *</label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: Laptop Lenovo Pro, Teléfono móvil..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Tarjeta de Crédito Asociada</label>
                <select
                  value={cardId}
                  onChange={(e) => setCardId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.bank})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Monto Total *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={totalAmountInput}
                    onChange={(e) => {
                      setTotalAmountInput(e.target.value);
                      handleAutoCalcInstallment(e.target.value, totalInstallments);
                    }}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Total de Cuotas *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={totalInstallments}
                    onChange={(e) => {
                      setTotalInstallments(e.target.value);
                      handleAutoCalcInstallment(totalAmountInput, e.target.value);
                    }}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Valor de Cada Cuota *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={installmentValueInput}
                    onChange={(e) => setInstallmentValueInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Cuotas Ya Pagadas</label>
                  <input
                    type="number"
                    min="0"
                    value={paidCount}
                    onChange={(e) => setPaidCount(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Fecha Primer Pago</label>
                <input
                  type="date"
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nota / Observación</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: Plan 12 meses sin recargo"
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
                  {editingItem ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
