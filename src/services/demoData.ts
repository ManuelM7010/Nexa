/**
 * NEXA Finance - Initial Categories & Realistic Demo Dataset
 * Tailored exactly to the user's example scenario:
 * Start date: 2026-09-12
 * Cash: $100, BAC Account: $850
 * BAC Card: $420 used, Card X: $150 used
 * Loan: $3,200 pending (original $5,000)
 * Installments: Laptop ($600, 12 cuotas de $50, 4 pagadas, 8 restantes)
 * Subscriptions: Netflix $12, Spotify $5
 * Services: Electricidad $45, Internet $35, Agua $18
 */

import {
  Account,
  CreditCard,
  Transaction,
  Category,
  Budget,
  InstallmentPurchase,
  Loan,
  Subscription,
  ServiceBill,
  InitialPosition,
  AppSettings,
} from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense categories
  { id: 'cat_housing', name: 'Vivienda y Alquiler', type: 'expense', icon: 'Home', color: '#3B82F6', isDefault: true },
  { id: 'cat_food', name: 'Alimentación y Supermercado', type: 'expense', icon: 'Utensils', color: '#10B981', isDefault: true },
  { id: 'cat_transport', name: 'Transporte y Combustible', type: 'expense', icon: 'Car', color: '#F59E0B', isDefault: true },
  { id: 'cat_services', name: 'Servicios Básicos', type: 'expense', icon: 'Zap', color: '#6366F1', isDefault: true },
  { id: 'cat_subscriptions', name: 'Suscripciones y Apps', type: 'expense', icon: 'Tv', color: '#EC4899', isDefault: true },
  { id: 'cat_installments', name: 'Compras a Cuotas', type: 'expense', icon: 'Layers', color: '#8B5CF6', isDefault: true },
  { id: 'cat_loan_payments', name: 'Cuotas de Préstamo', type: 'expense', icon: 'Landmark', color: '#EF4444', isDefault: true },
  { id: 'cat_health', name: 'Salud y Farmacia', type: 'expense', icon: 'HeartPulse', color: '#14B8A6', isDefault: true },
  { id: 'cat_entertainment', name: 'Entretenimiento y Ocio', type: 'expense', icon: 'Gamepad2', color: '#F97316', isDefault: true },
  { id: 'cat_personal', name: 'Cuidado Personal y Ropa', type: 'expense', icon: 'User', color: '#A855F7', isDefault: true },
  { id: 'cat_other_exp', name: 'Otros Gastos', type: 'expense', icon: 'MoreHorizontal', color: '#64748B', isDefault: true },

  // Income categories
  { id: 'cat_salary', name: 'Salario y Honorarios', type: 'income', icon: 'Briefcase', color: '#10B981', isDefault: true },
  { id: 'cat_freelance', name: 'Servicios Freelance', type: 'income', icon: 'Laptop', color: '#3B82F6', isDefault: true },
  { id: 'cat_investment', name: 'Rendimientos e Inversión', type: 'income', icon: 'TrendingUp', color: '#8B5CF6', isDefault: true },
  { id: 'cat_other_inc', name: 'Otros Ingresos', type: 'income', icon: 'Coins', color: '#F59E0B', isDefault: true },
];

export function getCleanEmptyData() {
  const settings: AppSettings = {
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'YYYY-MM-DD',
    firstDayOfWeek: 1,
    demoDataLoaded: false,
  };

  const initialPosition: InitialPosition = {
    startDate: '2026-09-12',
    cashBalanceCents: 0,
    bankBalances: {},
    creditCardUsedBalances: {},
    loanPendingBalances: {},
    isConfigured: false,
  };

  return {
    accounts: [],
    creditCards: [],
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    budgets: [],
    installmentPurchases: [],
    loans: [],
    loanPayments: [],
    subscriptions: [],
    services: [],
    initialPosition,
    monthlyCloses: [],
    settings,
  };
}

export function getRealisticDemoData() {
  const startDate = '2026-09-12';

  const accounts: Account[] = [
    {
      id: 'acc_cash',
      name: 'Efectivo Personal',
      type: 'cash',
      initialBalanceCents: 10000, // $100.00
      initialDate: startDate,
      active: true,
      color: '#10B981',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    {
      id: 'acc_bac',
      name: 'Cuenta BAC',
      bankName: 'BAC Credomatic',
      type: 'bank',
      initialBalanceCents: 85000, // $850.00
      initialDate: startDate,
      active: true,
      color: '#2563EB',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    {
      id: 'acc_agricola',
      name: 'Cuenta Banco Agrícola',
      bankName: 'Banco Agrícola',
      type: 'bank',
      initialBalanceCents: 22000, // $220.00
      initialDate: startDate,
      active: true,
      color: '#0D9488',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
  ];

  const creditCards: CreditCard[] = [
    {
      id: 'card_bac',
      name: 'Tarjeta BAC Black',
      bank: 'BAC Credomatic',
      creditLimitCents: 200000, // $2,000.00
      currentUsedBalanceCents: 42000, // $420.00
      statementClosingDay: 20,
      paymentDueDay: 15,
      usualPaymentDay: 14,
      color: '#DC2626',
      active: true,
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    {
      id: 'card_x',
      name: 'Tarjeta Oro Banco X',
      bank: 'Banco X',
      creditLimitCents: 120000, // $1,200.00
      currentUsedBalanceCents: 15000, // $150.00
      statementClosingDay: 28,
      paymentDueDay: 22,
      usualPaymentDay: 21,
      color: '#D97706',
      active: true,
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
  ];

  const installmentPurchases: InstallmentPurchase[] = [
    {
      id: 'inst_laptop',
      concept: 'Laptop Trabajo Lenovo Pro',
      purchaseDate: '2026-05-15',
      totalAmountCents: 60000, // $600.00
      creditCardId: 'card_bac',
      totalInstallments: 12,
      installmentValueCents: 5000, // $50.00 / month
      firstPaymentDate: '2026-06-15',
      frequency: 'monthly',
      paidInstallmentsCount: 4, // 4 already paid
      remainingInstallmentsCount: 8, // 8 pending
      note: 'Compra de equipo en cuotas sin intereses',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
  ];

  const loans: Loan[] = [
    {
      id: 'loan_car',
      name: 'Préstamo Auto Personal',
      originalAmountCents: 500000, // $5,000.00
      currentPendingBalanceCents: 320000, // $3,200.00
      installmentAmountCents: 18000, // $180.00
      frequency: 'monthly',
      paymentDay: 28,
      nextPaymentDate: '2026-09-28',
      totalInstallmentsCount: 36,
      paidInstallmentsCount: 10,
      fromAccountId: 'acc_bac',
      note: 'Crédito vehicular con débito a cuenta BAC',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
  ];

  const subscriptions: Subscription[] = [
    {
      id: 'sub_spotify',
      concept: 'Spotify Premium Familiar',
      amountCents: 500, // $5.00
      billingDay: 18,
      frequency: 'monthly',
      paymentMethodType: 'credit_card',
      paymentMethodId: 'card_bac',
      categoryId: 'cat_subscriptions',
      status: 'active',
      exceptionsByMonth: {
        '2026-12': { paused: true, note: 'Pausado durante vacaciones de diciembre' },
      },
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    {
      id: 'sub_netflix',
      concept: 'Netflix Estándar HD',
      amountCents: 1200, // $12.00
      billingDay: 25,
      frequency: 'monthly',
      paymentMethodType: 'credit_card',
      paymentMethodId: 'card_bac',
      categoryId: 'cat_subscriptions',
      status: 'active',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
  ];

  const services: ServiceBill[] = [
    {
      id: 'serv_power',
      company: 'DELSUR / CAESS',
      serviceName: 'Electricidad Residencial',
      budgetedAmountCents: 4500, // $45.00
      estimatedDay: 21,
      paymentMethodType: 'account',
      paymentMethodId: 'acc_bac',
      categoryId: 'cat_services',
      active: true,
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    {
      id: 'serv_internet',
      company: 'Claro Telecom',
      serviceName: 'Internet Fibra 300Mbps',
      budgetedAmountCents: 3500, // $35.00
      estimatedDay: 19,
      paymentMethodType: 'account',
      paymentMethodId: 'acc_bac',
      categoryId: 'cat_services',
      active: true,
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    {
      id: 'serv_water',
      company: 'ANDA',
      serviceName: 'Agua Potable',
      budgetedAmountCents: 1800, // $18.00
      estimatedDay: 23,
      paymentMethodType: 'account',
      paymentMethodId: 'acc_bac',
      categoryId: 'cat_services',
      active: true,
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
  ];

  const budgets: Budget[] = [
    { id: 'b_2026_09_food', yearMonth: '2026-09', categoryId: 'cat_food', budgetedAmountCents: 35000 },
    { id: 'b_2026_09_transport', yearMonth: '2026-09', categoryId: 'cat_transport', budgetedAmountCents: 10000 },
    { id: 'b_2026_09_services', yearMonth: '2026-09', categoryId: 'cat_services', budgetedAmountCents: 10000 },
    { id: 'b_2026_09_ent', yearMonth: '2026-09', categoryId: 'cat_entertainment', budgetedAmountCents: 8000 },
    { id: 'b_2026_09_subs', yearMonth: '2026-09', categoryId: 'cat_subscriptions', budgetedAmountCents: 2000 },
  ];

  // Specific planned and realized transactions for September 2026
  const transactions: Transaction[] = [
    // Planned upcoming salary on the 14th
    {
      id: 'tx_salary_sep14',
      date: '2026-09-14',
      expectedDate: '2026-09-14',
      concept: 'Pago de Quincena (Salario)',
      note: 'Depósito programado en cuenta bancaria',
      categoryId: 'cat_salary',
      type: 'income',
      amountCents: 68500, // $685.00
      accountId: 'acc_bac',
      status: 'planned',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    // End of month salary on the 30th
    {
      id: 'tx_salary_sep30',
      date: '2026-09-30',
      expectedDate: '2026-09-30',
      concept: 'Fin de Mes Quincena 2 (Salario)',
      note: 'Segunda quincena de septiembre',
      categoryId: 'cat_salary',
      type: 'income',
      amountCents: 68500, // $685.00
      accountId: 'acc_bac',
      status: 'planned',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    // Planned supermarket expense on the 13th
    {
      id: 'tx_super_sep13',
      date: '2026-09-13',
      expectedDate: '2026-09-13',
      concept: 'Supermercado semanal',
      note: 'Compra de víveres y despensa básica',
      categoryId: 'cat_food',
      type: 'expense',
      amountCents: 2500, // $25.00
      accountId: 'acc_bac',
      status: 'planned',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    // Planned payment of credit card BAC on the 15th
    {
      id: 'tx_cc_payment_sep15',
      date: '2026-09-15',
      expectedDate: '2026-09-15',
      concept: 'Pago mensual Tarjeta BAC (Obligación)',
      note: 'Liquidación de saldo utilizado del corte anterior',
      categoryId: 'cat_other_exp',
      type: 'credit_card_payment',
      amountCents: 35000, // $350.00
      accountId: 'acc_bac',
      creditCardId: 'card_bac',
      status: 'planned',
      relatedObligationId: 'card_bac',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
    // Planned additional expense on the 15th
    {
      id: 'tx_gas_sep15',
      date: '2026-09-15',
      expectedDate: '2026-09-15',
      concept: 'Combustible y Mantenimiento Menor',
      categoryId: 'cat_transport',
      type: 'expense',
      amountCents: 12000, // $120.00
      accountId: 'acc_bac',
      status: 'planned',
      createdAt: '2026-09-12T08:00:00Z',
      updatedAt: '2026-09-12T08:00:00Z',
    },
  ];

  const initialPosition: InitialPosition = {
    startDate,
    cashBalanceCents: 10000, // $100.00
    bankBalances: {
      acc_bac: 85000, // $850.00
      acc_agricola: 22000, // $220.00
    },
    creditCardUsedBalances: {
      card_bac: 42000, // $420.00
      card_x: 15000, // $150.00
    },
    loanPendingBalances: {
      loan_car: 320000, // $3,200.00
    },
    isConfigured: true,
  };

  const settings: AppSettings = {
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'YYYY-MM-DD',
    firstDayOfWeek: 1,
    demoDataLoaded: true,
  };

  return {
    accounts,
    creditCards,
    transactions,
    categories: DEFAULT_CATEGORIES,
    budgets,
    installmentPurchases,
    loans,
    loanPayments: [],
    subscriptions,
    services,
    initialPosition,
    monthlyCloses: [],
    settings,
  };
}
