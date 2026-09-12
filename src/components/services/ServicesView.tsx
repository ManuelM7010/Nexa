import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Calendar,
  Wallet,
  CreditCard,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  X,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { ServiceBill } from '../../types';
import { formatMoney, toCents, centsToInputString, getTodayDateString } from '../../services/financialEngine';

export const ServicesView: React.FC = () => {
  const {
    services,
    accounts,
    creditCards,
    selectedYearMonth,
    settings,
    addService,
    updateService,
    deleteService,
    updateServiceMonthlyRecord,
  } = useFinancial();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceBill | null>(null);

  // Real bill update modal state (Prompt #30)
  const [activeBillService, setActiveBillService] = useState<ServiceBill | null>(null);
  const [realAmountInput, setRealAmountInput] = useState('');
  const [realDate, setRealDate] = useState(getTodayDateString());
  const [billStatus, setBillStatus] = useState<'planned' | 'paid'>('paid');

  // Form states for service configuration
  const [serviceName, setServiceName] = useState('');
  const [company, setCompany] = useState('');
  const [budgetedAmountInput, setBudgetedAmountInput] = useState('45.00');
  const [estimatedDay, setEstimatedDay] = useState('20');
  const [paymentMethodType, setPaymentMethodType] = useState<'account' | 'credit_card'>('account');
  const [paymentMethodId, setPaymentMethodId] = useState('');

  const openNew = () => {
    setEditingService(null);
    setServiceName('');
    setCompany('');
    setBudgetedAmountInput('45.00');
    setEstimatedDay('20');
    setPaymentMethodType('account');
    setPaymentMethodId(accounts[0]?.id || '');
    setIsModalOpen(true);
  };

  const openEdit = (serv: ServiceBill) => {
    setEditingService(serv);
    setServiceName(serv.serviceName);
    setCompany(serv.company);
    setBudgetedAmountInput(centsToInputString(serv.budgetedAmountCents));
    setEstimatedDay(serv.estimatedDay.toString());
    setPaymentMethodType(serv.paymentMethodType);
    setPaymentMethodId(serv.paymentMethodId);
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const budgetedAmountCents = toCents(budgetedAmountInput);
    const day = parseInt(estimatedDay, 10) || 1;

    if (editingService) {
      await updateService({
        ...editingService,
        serviceName: serviceName.trim(),
        company: company.trim(),
        budgetedAmountCents,
        estimatedDay: day,
        paymentMethodType,
        paymentMethodId,
      });
    } else {
      await addService({
        serviceName: serviceName.trim(),
        company: company.trim(),
        budgetedAmountCents,
        estimatedDay: day,
        paymentMethodType,
        paymentMethodId,
        categoryId: 'cat_services',
        active: true,
      });
    }

    setIsModalOpen(false);
  };

  // Open Real Bill modal (Prompt #30)
  const openRealBillModal = (serv: ServiceBill) => {
    setActiveBillService(serv);
    const existing = serv.monthlyRecords?.[selectedYearMonth];
    setRealAmountInput(
      existing?.actualAmountCents !== undefined
        ? centsToInputString(existing.actualAmountCents)
        : centsToInputString(serv.budgetedAmountCents)
    );
    setRealDate(existing?.actualDate || getTodayDateString());
    setBillStatus(existing?.status || 'paid');
  };

  const handleSaveRealBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBillService) return;

    await updateServiceMonthlyRecord(activeBillService.id, selectedYearMonth, {
      actualAmountCents: toCents(realAmountInput),
      actualDate: realDate,
      status: billStatus,
    });

    setActiveBillService(null);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            Servicios Básicos (Electricidad, Agua, Internet...)
          </h2>
          <p className="text-xs text-slate-400">
            Proyección con montos estimados y actualización cuando llega la factura real
          </p>
        </div>

        <button
          onClick={openNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Servicio</span>
        </button>
      </div>

      {/* Grid of Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.length === 0 ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-400 rounded-2xl bg-slate-900 border border-slate-800">
            No tienes servicios básicos registrados. Haz clic en "Agregar Servicio" para comenzar.
          </div>
        ) : (
          services.map((serv) => {
            const account = accounts.find((a) => a.id === serv.paymentMethodId);
            const card = creditCards.find((c) => c.id === serv.paymentMethodId);
            const record = serv.monthlyRecords?.[selectedYearMonth];
            const isPaid = record?.status === 'paid';
            const effectiveAmount =
              record?.actualAmountCents !== undefined
                ? record.actualAmountCents
                : serv.budgetedAmountCents;

            return (
              <div
                key={serv.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-sm hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {serv.company}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                      {serv.serviceName}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(serv)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteService(serv.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Amount box */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">
                      {record?.actualAmountCents !== undefined ? 'Factura Real' : 'Monto Estimado'}
                    </span>
                    <div className="text-lg font-extrabold font-mono-nums text-white mt-0.5">
                      {formatMoney(effectiveAmount, settings.currencySymbol)}
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPaid
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {isPaid ? 'Pagado' : 'Proyectado'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">Día aprox: {serv.estimatedDay}</div>
                  </div>
                </div>

                {/* Payment Method Badge */}
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  {serv.paymentMethodType === 'account' ? (
                    <>
                      <Wallet className="w-3.5 h-3.5 text-blue-400" />
                      <span>{account?.name || 'Cuenta Bancaria'}</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{card?.name || 'Tarjeta de Crédito'}</span>
                    </>
                  )}
                </div>

                {/* Update Real Bill CTA (Prompt #30) */}
                <button
                  onClick={() => openRealBillModal(serv)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>
                    {record?.actualAmountCents !== undefined
                      ? 'Actualizar Factura Real'
                      : 'Llegó la factura: Registrar Monto Real'}
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Modal 1: Create / Edit Service Definition */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingService ? 'Editar Servicio' : 'Registrar Servicio Básico'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ej: Electricidad Residencial, Agua, Fibra 300M..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Empresa Proveedora *</label>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ej: DELSUR, ANDA, Claro..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Monto Estimado/Presupuestado *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={budgetedAmountInput}
                    onChange={(e) => setBudgetedAmountInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Día Estimado (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={estimatedDay}
                    onChange={(e) => setEstimatedDay(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 font-mono-nums text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Medio de Pago</label>
                <select
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.bankName || 'Efectivo'})
                    </option>
                  ))}
                  {creditCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.bank})
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
                  {editingService ? 'Guardar Cambios' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Update Real Bill (Prompt #30) */}
      {activeBillService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Factura Real: {activeBillService.serviceName} ({selectedYearMonth})
              </h3>
              <button
                onClick={() => setActiveBillService(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRealBill} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Monto Facturado Real *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={realAmountInput}
                    onChange={(e) => setRealAmountInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-7 pr-3 py-2 font-mono-nums font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Fecha de Pago</label>
                <input
                  type="date"
                  value={realDate}
                  onChange={(e) => setRealDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Estado</label>
                <select
                  value={billStatus}
                  onChange={(e) => setBillStatus(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="paid">Pagado</option>
                  <option value="planned">Planificado (Aún no pagado)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveBillService(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  Guardar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
