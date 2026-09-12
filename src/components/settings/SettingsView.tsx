import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Wallet,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { Account, AccountType } from '../../types';
import { formatMoney, toCents, centsToInputString } from '../../services/financialEngine';

export const SettingsView: React.FC = () => {
  const {
    accounts,
    accountBalances,
    settings,
    updateSettings,
    addAccount,
    updateAccount,
    deleteAccount,
    exportDataBackup,
    exportMovementsCSV,
    importDataBackup,
    loadDemoData,
    resetDatabase,
  } = useFinancial();

  // Account modal state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accBank, setAccBank] = useState('');
  const [accType, setAccType] = useState<AccountType>('checking');
  const [accBalanceInput, setAccBalanceInput] = useState('0.00');
  const [accInclude, setAccInclude] = useState(true);
  const [accColor, setAccColor] = useState('#2563EB');

  // Confirmation modal states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);
  const [resetInputMatch, setResetInputMatch] = useState('');

  // Currency settings
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [currencyCode, setCurrencyCode] = useState(settings.currency);

  const openNewAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccBank('');
    setAccType('checking');
    setAccBalanceInput('500.00');
    setAccInclude(true);
    setAccColor('#2563EB');
    setIsAccountModalOpen(true);
  };

  const openEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccBank(acc.bankName || '');
    setAccType(acc.type);
    setAccBalanceInput(centsToInputString(acc.initialBalanceCents));
    setAccInclude(acc.includeInCashFlow);
    setAccColor(acc.color || '#2563EB');
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const balanceCents = toCents(accBalanceInput);

    if (editingAccount) {
      await updateAccount({
        ...editingAccount,
        name: accName.trim(),
        bankName: accBank.trim() || undefined,
        type: accType,
        initialBalanceCents: balanceCents,
        includeInCashFlow: accInclude,
        color: accColor,
      });
    } else {
      await addAccount({
        name: accName.trim(),
        bankName: accBank.trim() || undefined,
        type: accType,
        initialBalanceCents: balanceCents,
        currency: settings.currency,
        includeInCashFlow: accInclude,
        color: accColor,
        active: true,
      });
    }

    setIsAccountModalOpen(false);
  };

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      currencySymbol: currencySymbol.trim() || '$',
      currency: currencyCode.trim() || 'USD',
    });
  };

  // Import JSON handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        await importDataBackup(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-400" />
            Configuración & Gestión de Cuentas
          </h2>
          <p className="text-xs text-slate-400">
            Administra tus cuentas bancarias, billeteras, privacidad local y copias de seguridad
          </p>
        </div>
      </div>

      {/* Section 1: Cuentas Bancarias y Efectivo (Prompt #13) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              Cuentas Bancarias y Billeteras
            </h3>
            <p className="text-xs text-slate-400">
              Cuentas de débito, cheques, ahorro, billeteras digitales y efectivo físico
            </p>
          </div>

          <button
            onClick={openNewAccount}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Cuenta</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => {
            const calculatedBalance = accountBalances[acc.id] ?? acc.initialBalanceCents;

            return (
              <div
                key={acc.id}
                className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-3 relative hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: acc.color || '#3B82F6' }}
                    />
                    <div>
                      <h4 className="font-bold text-white text-xs">{acc.name}</h4>
                      <span className="text-[10px] text-slate-400">
                        {acc.bankName ? `${acc.bankName} • ` : ''}
                        {acc.type === 'checking'
                          ? 'Corriente'
                          : acc.type === 'savings'
                          ? 'Ahorro'
                          : acc.type === 'cash'
                          ? 'Efectivo'
                          : 'Billetera Digital'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditAccount(acc)}
                      className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                      title="Editar cuenta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {accounts.length > 1 && (
                      <button
                        onClick={() => deleteAccount(acc.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Balances */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Saldo calculado:</span>
                    <span
                      className={`font-mono-nums font-bold ${
                        calculatedBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatMoney(calculatedBalance, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Saldo inicial:</span>
                    <span className="font-mono-nums">
                      {formatMoney(acc.initialBalanceCents, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Include in cash flow badge */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Flujo disponible:</span>
                  <span
                    className={`font-semibold ${
                      acc.includeInCashFlow ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {acc.includeInCashFlow ? 'Incluido' : 'Excluido'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Preferencias de Moneda y Privacidad (Prompt #4, #37) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Moneda */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Moneda y Símbolo</h3>
          <form onSubmit={handleSaveCurrency} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Código ISO</label>
                <input
                  type="text"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  placeholder="USD, EUR, MXN..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white uppercase focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Símbolo</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="$, €, Q, C$..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-white cursor-pointer"
            >
              Guardar Moneda
            </button>
          </form>
        </div>

        {/* Privacidad Local */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Privacidad y Seguridad Local
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            NEXA Finance opera 100% de manera local en tu navegador mediante <strong>IndexedDB</strong>. Ningún dato financiero se envía a servidores externos ni plataformas de nube.
          </p>

          <div className="pt-2">
            <button
              onClick={() => updateSettings({ hideAmounts: !settings.hideAmounts })}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                settings.hideAmounts
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              {settings.hideAmounts ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>Modo Privacidad Activo (Montos Ocultos)</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>Activar Modo Privacidad en Público</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Respaldo, Exportación e Importación (Prompt #36) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-400" />
          Copias de Seguridad y Control de Datos (100% Tuyo)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Export JSON */}
          <button
            onClick={exportDataBackup}
            className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/50 transition cursor-pointer text-left space-y-1.5 group"
          >
            <div className="flex items-center gap-2 text-white font-bold text-xs group-hover:text-blue-400">
              <Download className="w-4 h-4 text-blue-400" />
              <span>Exportar Backup JSON</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Descarga un archivo completo con todas tus cuentas, movimientos, tarjetas y presupuestos.
            </p>
          </button>

          {/* Export CSV */}
          <button
            onClick={exportMovementsCSV}
            className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 transition cursor-pointer text-left space-y-1.5 group"
          >
            <div className="flex items-center gap-2 text-white font-bold text-xs group-hover:text-emerald-400">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Movimientos a CSV</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Formato tabular compatible con Excel, Google Sheets o software de contabilidad.
            </p>
          </button>

          {/* Import JSON */}
          <label className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer text-left space-y-1.5 block group">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <div className="flex items-center gap-2 text-white font-bold text-xs group-hover:text-indigo-400">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Restaurar desde JSON</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Restaura tu información en cualquier momento desde un archivo de respaldo previo.
            </p>
          </label>
        </div>
      </div>

      {/* Section 4: Acciones Avanzadas (Cargar Demo / Limpiar Base de Datos) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">Mantenimiento de Datos</h3>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => setShowDemoConfirm(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span>Cargar Datos de Demostración</span>
          </button>

          <button
            onClick={() => {
              setResetInputMatch('');
              setShowResetConfirm(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 text-xs font-semibold text-rose-300 border border-rose-800/50 transition cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Limpiar Base de Datos</span>
          </button>
        </div>
      </div>

      {/* Modal 1: Account Create/Edit */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria / Efectivo'}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nombre de la Cuenta *</label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Ej: Nómina BAC, Efectivo Billetera, Ahorros..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Banco / Institución</label>
                  <input
                    type="text"
                    value={accBank}
                    onChange={(e) => setAccBank(e.target.value)}
                    placeholder="Ej: BAC, Cuscatlán, Efectivo..."
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipo de Cuenta</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="checking">Cuenta Corriente</option>
                    <option value="savings">Cuenta de Ahorro</option>
                    <option value="cash">Efectivo Físico</option>
                    <option value="digital_wallet">Billetera Digital</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Saldo Inicial *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-bold text-slate-400">{settings.currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={accBalanceInput}
                    onChange={(e) => setAccBalanceInput(e.target.value)}
                    className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-7 pr-3 py-2 font-mono-nums font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Color Identificador</label>
                  <input
                    type="color"
                    value={accColor}
                    onChange={(e) => setAccColor(e.target.value)}
                    className="w-10 h-8 rounded border border-slate-700 bg-slate-800 cursor-pointer"
                  />
                </div>

                <label className="flex items-center gap-2 pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accInclude}
                    onChange={(e) => setAccInclude(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0"
                  />
                  <span className="font-semibold text-slate-300">
                    Incluir en cálculo de liquidez principal
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer"
                >
                  {editingAccount ? 'Guardar Cambios' : 'Registrar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirm Reset Database (Prompt #36) */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/50 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">¿Limpiar toda la base de datos?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción eliminará de forma irreversible todas las transacciones, tarjetas, presupuestos y cuentas registradas en tu navegador.
            </p>

            <div className="space-y-1 text-xs">
              <label className="block text-slate-400">
                Para confirmar, escribe <strong>BORRAR</strong> abajo:
              </label>
              <input
                type="text"
                value={resetInputMatch}
                onChange={(e) => setResetInputMatch(e.target.value)}
                placeholder="Escribe BORRAR"
                className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                disabled={resetInputMatch !== 'BORRAR'}
                onClick={async () => {
                  await resetDatabase();
                  setShowResetConfirm(false);
                }}
                className={`px-5 py-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                  resetInputMatch === 'BORRAR'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Confirmar y Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Confirm Load Demo Data */}
      {showDemoConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-blue-400" />
              Cargar Datos de Demostración
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Deseas cargar los datos de ejemplo iniciales (cuentas, tarjetas BAC/Cuscatlán, compras a cuotas, préstamos, nóminas y servicios)?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowDemoConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await loadDemoData();
                  setShowDemoConfirm(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer text-xs"
              >
                Cargar Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
