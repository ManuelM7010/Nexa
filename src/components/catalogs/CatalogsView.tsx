import React, { useState } from 'react';
import {
  Tag,
  CreditCard as CardIcon,
  Wallet,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Palette,
  Layers,
  Building,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { Category, Account, CreditCard, AccountType } from '../../types';
import {
  formatMoney,
  toCents,
  centsToInputString,
  getTodayDateString,
} from '../../services/financialEngine';

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#64748B', // Slate
];

export const CatalogsView: React.FC = () => {
  const {
    categories,
    accounts,
    creditCards,
    settings,
    addCategory,
    updateCategory,
    deleteCategory,
    addAccount,
    updateAccount,
    deleteAccount,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
  } = useFinancial();

  const [activeTab, setActiveTab] = useState<'categories' | 'cards' | 'accounts'>('categories');

  // Category Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);

  // Credit Card Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('');
  const [cardLimitInput, setCardLimitInput] = useState('2000');
  const [cardUsedInput, setCardUsedInput] = useState('0');
  const [cardClosingDay, setCardClosingDay] = useState('20');
  const [cardDueDay, setCardDueDay] = useState('15');

  // Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('checking');
  const [accBankName, setAccBankName] = useState('');
  const [accBalanceInput, setAccBalanceInput] = useState('1000');

  // ---------------- Handlers for Categories ----------------
  const openNewCategory = () => {
    setEditingCat(null);
    setCatName('');
    setCatType('expense');
    setCatColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    setIsCatModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatType(cat.type);
    setCatColor(cat.color || PRESET_COLORS[0]);
    setIsCatModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCat) {
      await updateCategory({
        ...editingCat,
        name: catName.trim(),
        type: catType,
        color: catColor,
      });
    } else {
      await addCategory({
        name: catName.trim(),
        type: catType,
        color: catColor,
        icon: catType === 'income' ? 'TrendingUp' : 'Tag',
      });
    }
    setIsCatModalOpen(false);
  };

  // ---------------- Handlers for Credit Cards ----------------
  const openNewCard = () => {
    setEditingCard(null);
    setCardName('');
    setCardBank('');
    setCardLimitInput('2000');
    setCardUsedInput('0');
    setCardClosingDay('20');
    setCardDueDay('15');
    setIsCardModalOpen(true);
  };

  const openEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setCardName(card.name);
    setCardBank(card.bank);
    setCardLimitInput(centsToInputString(card.creditLimitCents));
    setCardUsedInput(centsToInputString(card.currentUsedBalanceCents));
    setCardClosingDay(card.statementClosingDay.toString());
    setCardDueDay(card.paymentDueDay.toString());
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) return;
    const limitCents = toCents(cardLimitInput);
    const usedCents = toCents(cardUsedInput);

    if (editingCard) {
      await updateCreditCard({
        ...editingCard,
        name: cardName.trim(),
        bank: cardBank.trim(),
        creditLimitCents: limitCents,
        currentUsedBalanceCents: usedCents,
        statementClosingDay: parseInt(cardClosingDay, 10),
        paymentDueDay: parseInt(cardDueDay, 10),
      });
    } else {
      await addCreditCard({
        name: cardName.trim(),
        bank: cardBank.trim(),
        creditLimitCents: limitCents,
        currentUsedBalanceCents: usedCents,
        statementClosingDay: parseInt(cardClosingDay, 10),
        paymentDueDay: parseInt(cardDueDay, 10),
        color: '#DC2626',
        active: true,
      });
    }
    setIsCardModalOpen(false);
  };

  // ---------------- Handlers for Accounts ----------------
  const openNewAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('checking');
    setAccBankName('');
    setAccBalanceInput('1000');
    setIsAccountModalOpen(true);
  };

  const openEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBankName(acc.bankName || '');
    setAccBalanceInput(centsToInputString(acc.initialBalanceCents));
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const balanceCents = toCents(accBalanceInput);

    if (editingAccount) {
      await updateAccount({
        ...editingAccount,
        name: accName.trim(),
        type: accType,
        bankName: accBankName.trim() || undefined,
        initialBalanceCents: balanceCents,
      });
    } else {
      await addAccount({
        name: accName.trim(),
        type: accType,
        bankName: accBankName.trim() || undefined,
        initialBalanceCents: balanceCents,
        initialDate: getTodayDateString(),
        active: true,
        includeInCashFlow: true,
      });
    }
    setIsAccountModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-400" />
            Catálogos y Gestión de Elementos
          </h2>
          <p className="text-xs text-slate-400">
            Agrega, edita y elimina Categorías de gastos/ingresos, Tarjetas de Crédito y Cuentas Bancarias
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Categorías ({categories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cards'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CardIcon className="w-3.5 h-3.5" />
            <span>Tarjetas ({creditCards.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'accounts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Cuentas ({accounts.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Administra tus categorías para clasificar gastos e ingresos en presupuestos y reportes.
            </span>
            <button
              onClick={openNewCategory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Categoría</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-inner"
                    style={{ backgroundColor: cat.color || '#3B82F6' }}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{cat.name}</h4>
                    <span className="text-[10px] font-semibold text-slate-400 capitalize">
                      {cat.type === 'expense' ? 'Gasto' : 'Ingreso'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditCategory(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Editar categoría"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CREDIT CARDS */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Registra y administra tus tarjetas de crédito, cupos y fechas de corte.
            </span>
            <button
              onClick={openNewCard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar Tarjeta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creditCards.map((card) => (
              <div
                key={card.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                      {card.bank}
                    </span>
                    <h3 className="text-base font-bold text-white">{card.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditCard(card)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCreditCard(card.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Límite de Crédito</span>
                    <div className="text-sm font-bold font-mono text-white mt-0.5">
                      {formatMoney(card.creditLimitCents, settings.currencySymbol)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Saldo Utilizado</span>
                    <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
                      {formatMoney(card.currentUsedBalanceCents, settings.currencySymbol)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800">
                  <span>Corte: <strong>Día {card.statementClosingDay}</strong></span>
                  <span>Pago límite: <strong>Día {card.paymentDueDay}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Administra tus cuentas bancarias, cuentas de ahorro y efectivo disponible.
            </span>
            <button
              onClick={openNewAccount}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Cuenta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {acc.bankName || 'Efectivo / Personal'}
                  </span>
                  <h3 className="text-base font-bold text-white">{acc.name}</h3>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                    Saldo Base: {formatMoney(acc.initialBalanceCents, settings.currencySymbol)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditAccount(acc)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteAccount(acc.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ej. Alimentación, Freelance, Gimnasio..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatType('expense')}
                    className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer border ${
                      catType === 'expense'
                        ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Gasto
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('income')}
                    className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer border ${
                      catType === 'income'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Ingreso
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Color Identificador
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCatColor(color)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                        catColor === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {catColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDIT CARD MODAL */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingCard ? 'Editar Tarjeta de Crédito' : 'Registrar Tarjeta de Crédito'}
              </h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Tarjeta
                </label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Ej. Visa Platinum, Amex Gold..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Banco Emisor
                </label>
                <input
                  type="text"
                  required
                  value={cardBank}
                  onChange={(e) => setCardBank(e.target.value)}
                  placeholder="Ej. Santander, BBVA, Chase..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Límite Total ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={cardLimitInput}
                    onChange={(e) => setCardLimitInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Saldo Utilizado ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={cardUsedInput}
                    onChange={(e) => setCardUsedInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Día de Corte (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardClosingDay}
                    onChange={(e) => setCardClosingDay(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Día Límite de Pago (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={cardDueDay}
                    onChange={(e) => setCardDueDay(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition"
                >
                  Guardar Tarjeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Cuenta
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="Ej. Nómina Santander, Billetera Efectivo..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo</label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccountType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="checking">Cuenta Corriente / Cheques</option>
                  <option value="savings">Cuenta de Ahorros</option>
                  <option value="cash">Efectivo / Billetera Física</option>
                  <option value="digital_wallet">Billetera Digital (PayPal, etc.)</option>
                  <option value="bank">Cuenta Bancaria General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Banco / Entidad (Opcional)
                </label>
                <input
                  type="text"
                  value={accBankName}
                  onChange={(e) => setAccBankName(e.target.value)}
                  placeholder="Ej. Santander, BBVA, MercadoPago..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Saldo Inicial / Base ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={accBalanceInput}
                  onChange={(e) => setAccBalanceInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition"
                >
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
