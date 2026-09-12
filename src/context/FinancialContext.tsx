/**
 * NEXA Finance - Central State & Event Management Context
 * Connects IndexedDB local-first persistence with the real-time calculation engine.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Account,
  CreditCard,
  Transaction,
  Category,
  Budget,
  InstallmentPurchase,
  Loan,
  LoanPayment,
  Subscription,
  ServiceBill,
  InitialPosition,
  MonthlyClose,
  AppSettings,
  DailyCashFlowItem,
  ExecutiveSummary,
  FinancialAlert,
} from '../types';
import { dbService, FullBackupPayload } from '../services/db';
import {
  getRealisticDemoData,
  getCleanEmptyData,
  DEFAULT_CATEGORIES,
} from '../services/demoData';
import {
  generateProjectedEvents,
  calculateDailyTimeline,
  calculateExecutiveSummary,
  generateFinancialAlerts,
  calculateBudgetVsReal,
  calculateComprehensiveBudgetAnalysis,
  getTodayDateString,
  addDays,
} from '../services/financialEngine';

export type AppView =
  | 'dashboard'
  | 'cashflow'
  | 'matrix'
  | 'movements'
  | 'budget'
  | 'calendar'
  | 'cards'
  | 'card_statements'
  | 'installments'
  | 'loans'
  | 'subscriptions'
  | 'services'
  | 'monthlyclose'
  | 'reports'
  | 'catalogs'
  | 'settings';

interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface FinancialContextValue {
  isLoading: boolean;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedYear: number;
  selectedMonth: number; // 0-11
  selectedYearMonth: string; // 'YYYY-MM'
  setSelectedYearMonth: (year: number, month: number) => void;

  // Domain state
  accounts: Account[];
  creditCards: CreditCard[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  installmentPurchases: InstallmentPurchase[];
  loans: Loan[];
  loanPayments: LoanPayment[];
  subscriptions: Subscription[];
  services: ServiceBill[];
  initialPosition: InitialPosition | null;
  monthlyCloses: MonthlyClose[];
  settings: AppSettings;

  // Calculated engine outputs
  allTransactionsCombined: Transaction[];
  dailyTimeline: DailyCashFlowItem[];
  accountBalances: Record<string, number>;
  todayCashBalanceCents: number;
  executiveSummary: ExecutiveSummary;
  monthlySummary: ExecutiveSummary; // Alias for executiveSummary
  financialAlerts: FinancialAlert[];
  budgetVsReal: ReturnType<typeof calculateBudgetVsReal>;
  budgetAnalysis: ReturnType<typeof calculateComprehensiveBudgetAnalysis>;

  // Action methods
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  duplicateTransaction: (id: string) => Promise<void>;
  toggleTransactionStatus: (id: string, newStatus: 'planned' | 'completed' | 'cancelled') => Promise<void>;
  updateTransactionExecution: (id: string, actualAmountCents: number, note?: string) => Promise<void>;

  addCategory: (cat: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (cat: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addAccount: (acc: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (acc: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addCreditCard: (card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCreditCard: (card: CreditCard) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;

  addInstallmentPurchase: (p: Omit<InstallmentPurchase, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateInstallmentPurchase: (p: InstallmentPurchase) => Promise<void>;
  deleteInstallmentPurchase: (id: string) => Promise<void>;

  addLoan: (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLoan: (loan: Loan) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  makeLoanPayment: (
    loanId: string,
    amountCents: number,
    type: 'regular' | 'extraordinary_capital',
    date: string,
    accountId?: string,
    note?: string
  ) => Promise<void>;

  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSubscription: (sub: Subscription) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  toggleSubscriptionPause: (id: string) => Promise<void>;
  setSubscriptionMonthException: (
    subId: string,
    yearMonth: string,
    exception: { paused?: boolean; overrideAmountCents?: number; overrideDay?: number; note?: string }
  ) => Promise<void>;

  addService: (serv: Omit<ServiceBill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateService: (serv: ServiceBill) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  updateServiceMonthlyRecord: (
    servId: string,
    yearMonth: string,
    record: { actualAmountCents?: number; actualDate?: string; status?: 'planned' | 'paid'; note?: string }
  ) => Promise<void>;

  setCategoryBudget: (yearMonth: string, categoryId: string, amountCents: number) => Promise<void>;
  copyPreviousMonthBudget: (targetYearMonth: string) => Promise<void>;
  saveInitialPosition: (pos: InitialPosition) => Promise<void>;
  closeMonth: (yearMonth: string, notes?: string) => Promise<void>;
  reopenMonth: (yearMonth: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  loadDemoData: () => Promise<void>;
  resetAllData: (startFresh: boolean) => Promise<void>;
  exportBackup: () => Promise<FullBackupPayload>;
  importBackup: (payload: FullBackupPayload) => Promise<void>;
  exportMovementsCSV: () => void;
  exportDataBackup: () => Promise<void>;

  notification: NotificationItem | null;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;
}

const FinancialContext = createContext<FinancialContextValue | null>(null);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  // Today reference
  const todayStr = useMemo(() => getTodayDateString(), []);
  const todayDate = useMemo(() => new Date(), []);

  // Time navigation state (defaults to current year/month e.g., 2026-09)
  const [selectedYear, setSelectedYear] = useState<number>(todayDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(todayDate.getMonth());

  const selectedYearMonth = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // Persistent store collections
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [installmentPurchases, setInstallmentPurchases] = useState<InstallmentPurchase[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanPayments, setLoanPayments] = useState<LoanPayment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [services, setServices] = useState<ServiceBill[]>([]);
  const [initialPosition, setInitialPosition] = useState<InitialPosition | null>(null);
  const [monthlyCloses, setMonthlyCloses] = useState<MonthlyClose[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'YYYY-MM-DD',
    firstDayOfWeek: 1,
    demoDataLoaded: false,
  });

  const [notification, setNotification] = useState<NotificationItem | null>(null);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ id: Date.now().toString(), message, type });
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Auto clear notification after 4s
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Load from IndexedDB on startup
  const loadDatabase = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        accs,
        cards,
        txs,
        cats,
        bdgs,
        insts,
        lns,
        lnPmts,
        subs,
        servs,
        initPosArr,
        closes,
        settArr,
      ] = await Promise.all([
        dbService.getAll<Account>('accounts'),
        dbService.getAll<CreditCard>('credit_cards'),
        dbService.getAll<Transaction>('transactions'),
        dbService.getAll<Category>('categories'),
        dbService.getAll<Budget>('budgets'),
        dbService.getAll<InstallmentPurchase>('installment_purchases'),
        dbService.getAll<Loan>('loans'),
        dbService.getAll<LoanPayment>('loan_payments'),
        dbService.getAll<Subscription>('subscriptions'),
        dbService.getAll<ServiceBill>('services'),
        dbService.getAll<InitialPosition & { id: string }>('initial_position'),
        dbService.getAll<MonthlyClose>('monthly_closes'),
        dbService.getAll<AppSettings & { id: string }>('settings'),
      ]);

      if (cats.length === 0 && accs.length === 0 && (!settArr || settArr.length === 0)) {
        // First time initialization: populate default demo dataset so user immediately sees value!
        const demo = getRealisticDemoData();
        await dbService.importFullBackup({
          version: 1,
          exportedAt: new Date().toISOString(),
          app: 'NEXA Finance',
          data: demo,
        });

        setAccounts(demo.accounts);
        setCreditCards(demo.creditCards);
        setTransactions(demo.transactions);
        setCategories(demo.categories);
        setBudgets(demo.budgets);
        setInstallmentPurchases(demo.installmentPurchases);
        setLoans(demo.loans);
        setLoanPayments(demo.loanPayments);
        setSubscriptions(demo.subscriptions);
        setServices(demo.services);
        setInitialPosition(demo.initialPosition);
        setMonthlyCloses(demo.monthlyCloses);
        setSettings(demo.settings);
      } else {
        setAccounts(accs);
        setCreditCards(cards);
        setTransactions(txs);
        setCategories(cats.length > 0 ? cats : DEFAULT_CATEGORIES);
        setBudgets(bdgs);
        setInstallmentPurchases(insts);
        setLoans(lns);
        setLoanPayments(lnPmts);
        setSubscriptions(subs);
        setServices(servs);
        setInitialPosition(initPosArr.length > 0 ? initPosArr[0] : null);
        setMonthlyCloses(closes);
        if (settArr.length > 0) {
          setSettings(settArr[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load local database:', err);
      notify('Error al cargar la base de datos local. Usando respaldo en memoria.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Month navigation setter
  const setSelectedYearMonth = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  }, []);

  // -------------------------------------------------------------
  // RE-CALCULATION & EVENT ENGINE (PROJECTION HORIZON THROUGH 2030)
  // -------------------------------------------------------------
  const projectionHorizonStart = useMemo(() => {
    return initialPosition?.startDate || todayStr;
  }, [initialPosition, todayStr]);

  // Generate projection up to December 31, 2030
  const projectionHorizonEnd = '2030-12-31';

  // 1. Synthesize projected events
  const allTransactionsCombined = useMemo(() => {
    const projected = generateProjectedEvents(
      projectionHorizonStart,
      projectionHorizonEnd,
      subscriptions,
      services,
      installmentPurchases,
      loans,
      transactions
    );

    return [...transactions, ...projected].sort((a, b) => a.date.localeCompare(b.date));
  }, [
    projectionHorizonStart,
    projectionHorizonEnd,
    subscriptions,
    services,
    installmentPurchases,
    loans,
    transactions,
  ]);

  // 2. Daily Cash Flow Timeline
  // Compute full timeline from projection start through end of selected year/month + 60 days
  const timelineHorizonEnd = useMemo(() => {
    const lastDayOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-31`;
    return addDays(lastDayOfMonth, 60);
  }, [selectedYear, selectedMonth]);

  const { dailyItems, accountBalances, todayCashBalanceCents } = useMemo(() => {
    return calculateDailyTimeline(
      projectionHorizonStart,
      timelineHorizonEnd,
      accounts,
      initialPosition,
      allTransactionsCombined
    );
  }, [
    projectionHorizonStart,
    timelineHorizonEnd,
    accounts,
    initialPosition,
    allTransactionsCombined,
  ]);

  // 3. Executive Summary
  const executiveSummary = useMemo(() => {
    return calculateExecutiveSummary(
      selectedYearMonth,
      accounts,
      creditCards,
      loans,
      dailyItems,
      allTransactionsCombined,
      todayCashBalanceCents
    );
  }, [
    selectedYearMonth,
    accounts,
    creditCards,
    loans,
    dailyItems,
    allTransactionsCombined,
    todayCashBalanceCents,
  ]);

  // 4. Financial Alerts
  const financialAlerts = useMemo(() => {
    return generateFinancialAlerts(dailyItems, executiveSummary, todayStr);
  }, [dailyItems, executiveSummary, todayStr]);

  // 5. Budget vs Real & Comprehensive Budget Analysis
  const budgetAnalysis = useMemo(() => {
    return calculateComprehensiveBudgetAnalysis(
      selectedYearMonth,
      categories,
      budgets,
      allTransactionsCombined,
      todayStr
    );
  }, [selectedYearMonth, categories, budgets, allTransactionsCombined, todayStr]);

  const budgetVsReal = useMemo(() => {
    return calculateBudgetVsReal(selectedYearMonth, categories, budgets, allTransactionsCombined);
  }, [selectedYearMonth, categories, budgets, allTransactionsCombined]);

  // -------------------------------------------------------------
  // CRUD ACTIONS (ALL ACID PERSISTED TO INDEXEDDB)
  // -------------------------------------------------------------

  // Transactions
  const addTransaction = useCallback(
    async (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newTx: Transaction = {
        ...tx,
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };

      // If it is a credit card purchase, update the credit card used balance
      if (newTx.creditCardId && newTx.type === 'expense') {
        const card = creditCards.find((c) => c.id === newTx.creditCardId);
        if (card) {
          const updatedCard = {
            ...card,
            currentUsedBalanceCents: card.currentUsedBalanceCents + newTx.amountCents,
            updatedAt: now,
          };
          await dbService.put('credit_cards', updatedCard);
          setCreditCards((prev) => prev.map((c) => (c.id === card.id ? updatedCard : c)));
        }
      }

      // If it is a credit card payment, update the credit card used balance (reduces it)
      if (newTx.creditCardId && newTx.type === 'credit_card_payment') {
        const card = creditCards.find((c) => c.id === newTx.creditCardId);
        if (card) {
          const updatedCard = {
            ...card,
            currentUsedBalanceCents: Math.max(0, card.currentUsedBalanceCents - newTx.amountCents),
            updatedAt: now,
          };
          await dbService.put('credit_cards', updatedCard);
          setCreditCards((prev) => prev.map((c) => (c.id === card.id ? updatedCard : c)));
        }
      }

      await dbService.put('transactions', newTx);
      setTransactions((prev) => [newTx, ...prev]);
      notify('Movimiento guardado exitosamente.');
    },
    [creditCards, notify]
  );

  const updateTransaction = useCallback(
    async (tx: Transaction) => {
      const updatedTx: Transaction = {
        ...tx,
        updatedAt: new Date().toISOString(),
      };
      await dbService.put('transactions', updatedTx);
      setTransactions((prev) => prev.map((t) => (t.id === tx.id ? updatedTx : t)));
      notify('Movimiento actualizado y proyecciones recalculadas.');
    },
    [notify]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await dbService.delete('transactions', id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      notify('Movimiento eliminado.');
    },
    [notify]
  );

  const duplicateTransaction = useCallback(
    async (id: string) => {
      const source = transactions.find((t) => t.id === id);
      if (!source) return;
      const now = new Date().toISOString();
      const dup: Transaction = {
        ...source,
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        concept: `${source.concept} (Copia)`,
        createdAt: now,
        updatedAt: now,
      };
      await dbService.put('transactions', dup);
      setTransactions((prev) => [dup, ...prev]);
      notify('Movimiento duplicado.');
    },
    [transactions, notify]
  );

  const toggleTransactionStatus = useCallback(
    async (id: string, newStatus: 'planned' | 'completed' | 'cancelled') => {
      const target = transactions.find((t) => t.id === id);
      if (target) {
        const updated: Transaction = {
          ...target,
          status: newStatus,
          actualDate: newStatus === 'completed' ? (target.actualDate || getTodayDateString()) : target.actualDate,
          updatedAt: new Date().toISOString(),
        };
        await dbService.put('transactions', updated);
        setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
        notify(`Estado de movimiento actualizado a ${newStatus === 'completed' ? 'Realizado' : newStatus === 'planned' ? 'Planificado' : 'Cancelado'}.`);
      } else {
        // Was a generated event! Convert to a concrete manual transaction with status
        const generated = allTransactionsCombined.find((t) => t.id === id);
        if (generated) {
          const concrete: Transaction = {
            ...generated,
            status: newStatus,
            actualDate: newStatus === 'completed' ? getTodayDateString() : undefined,
            isGenerated: false,
            updatedAt: new Date().toISOString(),
          };
          await dbService.put('transactions', concrete);
          setTransactions((prev) => [concrete, ...prev]);
          notify('Evento recurrente confirmado y registrado localmente.');
        }
      }
    },
    [transactions, allTransactionsCombined, notify]
  );

  const updateTransactionExecution = useCallback(
    async (id: string, actualAmountCents: number, note?: string) => {
      const today = getTodayDateString();
      const target = transactions.find((t) => t.id === id);
      if (target) {
        const plannedAmount = target.plannedAmountCents ?? target.amountCents;
        const updated: Transaction = {
          ...target,
          plannedAmountCents: plannedAmount,
          actualAmountCents: actualAmountCents,
          // If actual spent is provided, the effective executed amount reflects it
          amountCents: actualAmountCents > 0 ? actualAmountCents : target.amountCents,
          status: actualAmountCents >= plannedAmount ? 'completed' : 'planned',
          actualDate: today,
          partialExecutionNote: note ?? target.partialExecutionNote,
          updatedAt: new Date().toISOString(),
        };
        await dbService.put('transactions', updated);
        setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
        notify('Ejecución de gasto/ingreso actualizada.');
      } else {
        const generated = allTransactionsCombined.find((t) => t.id === id);
        if (generated) {
          const plannedAmount = generated.plannedAmountCents ?? generated.amountCents;
          const concrete: Transaction = {
            ...generated,
            plannedAmountCents: plannedAmount,
            actualAmountCents: actualAmountCents,
            amountCents: actualAmountCents > 0 ? actualAmountCents : generated.amountCents,
            status: actualAmountCents >= plannedAmount ? 'completed' : 'planned',
            actualDate: today,
            partialExecutionNote: note,
            isGenerated: false,
            updatedAt: new Date().toISOString(),
          };
          await dbService.put('transactions', concrete);
          setTransactions((prev) => [concrete, ...prev]);
          notify('Ejecución registrada y movimiento fijado localmente.');
        }
      }
    },
    [transactions, allTransactionsCombined, notify]
  );

  // Categories CRUD
  const addCategory = useCallback(
    async (cat: Omit<Category, 'id'>) => {
      const newCat: Category = {
        ...cat,
        id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      };
      await dbService.put('categories', newCat);
      setCategories((prev) => [...prev, newCat]);
      notify(`Categoría "${newCat.name}" creada.`);
    },
    [notify]
  );

  const updateCategory = useCallback(
    async (cat: Category) => {
      await dbService.put('categories', cat);
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)));
      notify(`Categoría "${cat.name}" actualizada.`);
    },
    [notify]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await dbService.delete('categories', id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      notify('Categoría eliminada.');
    },
    [notify]
  );

  // Accounts
  const addAccount = useCallback(
    async (acc: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newAcc: Account = {
        ...acc,
        id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbService.put('accounts', newAcc);
      setAccounts((prev) => [...prev, newAcc]);
      notify('Cuenta agregada exitosamente.');
    },
    [notify]
  );

  const updateAccount = useCallback(
    async (acc: Account) => {
      const updated: Account = { ...acc, updatedAt: new Date().toISOString() };
      await dbService.put('accounts', updated);
      setAccounts((prev) => prev.map((a) => (a.id === acc.id ? updated : a)));
      notify('Cuenta actualizada.');
    },
    [notify]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      await dbService.delete('accounts', id);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      notify('Cuenta eliminada.');
    },
    [notify]
  );

  // Credit Cards
  const addCreditCard = useCallback(
    async (card: Omit<CreditCard, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newCard: CreditCard = {
        ...card,
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbService.put('credit_cards', newCard);
      setCreditCards((prev) => [...prev, newCard]);
      notify('Tarjeta de crédito agregada.');
    },
    [notify]
  );

  const updateCreditCard = useCallback(
    async (card: CreditCard) => {
      const updated: CreditCard = { ...card, updatedAt: new Date().toISOString() };
      await dbService.put('credit_cards', updated);
      setCreditCards((prev) => prev.map((c) => (c.id === card.id ? updated : c)));
      notify('Tarjeta actualizada.');
    },
    [notify]
  );

  const deleteCreditCard = useCallback(
    async (id: string) => {
      await dbService.delete('credit_cards', id);
      setCreditCards((prev) => prev.filter((c) => c.id !== id));
      notify('Tarjeta eliminada.');
    },
    [notify]
  );

  // Compras a cuotas
  const addInstallmentPurchase = useCallback(
    async (p: Omit<InstallmentPurchase, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newInst: InstallmentPurchase = {
        ...p,
        id: `inst_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbService.put('installment_purchases', newInst);
      setInstallmentPurchases((prev) => [...prev, newInst]);
      notify('Compra a cuotas registrada.');
    },
    [notify]
  );

  const updateInstallmentPurchase = useCallback(
    async (p: InstallmentPurchase) => {
      const updated: InstallmentPurchase = { ...p, updatedAt: new Date().toISOString() };
      await dbService.put('installment_purchases', updated);
      setInstallmentPurchases((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
      notify('Compra a cuotas actualizada.');
    },
    [notify]
  );

  const deleteInstallmentPurchase = useCallback(
    async (id: string) => {
      await dbService.delete('installment_purchases', id);
      setInstallmentPurchases((prev) => prev.filter((item) => item.id !== id));
      notify('Compra a cuotas eliminada.');
    },
    [notify]
  );

  // Loans (Préstamos)
  const addLoan = useCallback(
    async (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newLoan: Loan = {
        ...loan,
        id: `loan_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbService.put('loans', newLoan);
      setLoans((prev) => [...prev, newLoan]);
      notify('Préstamo registrado exitosamente.');
    },
    [notify]
  );

  const updateLoan = useCallback(
    async (loan: Loan) => {
      const updated: Loan = { ...loan, updatedAt: new Date().toISOString() };
      await dbService.put('loans', updated);
      setLoans((prev) => prev.map((l) => (l.id === loan.id ? updated : l)));
      notify('Préstamo actualizado.');
    },
    [notify]
  );

  const deleteLoan = useCallback(
    async (id: string) => {
      await dbService.delete('loans', id);
      setLoans((prev) => prev.filter((l) => l.id !== id));
      notify('Préstamo eliminado.');
    },
    [notify]
  );

  const makeLoanPayment = useCallback(
    async (
      loanId: string,
      amountCents: number,
      type: 'regular' | 'extraordinary_capital',
      date: string,
      accountId?: string,
      note?: string
    ) => {
      const targetLoan = loans.find((l) => l.id === loanId);
      if (!targetLoan) return;

      const paymentId = `lp_${Date.now()}`;
      const newPayment: LoanPayment = {
        id: paymentId,
        loanId,
        date,
        amountCents,
        type,
        accountId,
        note: note || (type === 'extraordinary_capital' ? 'Abono extraordinario a capital' : 'Pago regular de cuota'),
        createdAt: new Date().toISOString(),
      };

      // Reduce loan pending balance directly: Saldo pendiente = saldo anterior - abono
      const newBalance = Math.max(0, targetLoan.currentPendingBalanceCents - amountCents);
      const updatedLoan: Loan = {
        ...targetLoan,
        currentPendingBalanceCents: newBalance,
        paidInstallmentsCount:
          type === 'regular'
            ? targetLoan.paidInstallmentsCount + 1
            : targetLoan.paidInstallmentsCount,
        updatedAt: new Date().toISOString(),
      };

      // Also create movement if paid from account
      if (accountId) {
        const tx: Transaction = {
          id: `tx_loan_${paymentId}`,
          date,
          actualDate: date,
          concept: `${type === 'extraordinary_capital' ? 'Abono a Capital: ' : 'Cuota: '}${targetLoan.name}`,
          note: newPayment.note,
          categoryId: 'cat_loan_payments',
          type: 'loan_payment',
          amountCents,
          accountId,
          status: 'completed',
          relatedLoanId: loanId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await dbService.put('transactions', tx);
        setTransactions((prev) => [tx, ...prev]);
      }

      await dbService.put('loan_payments', newPayment);
      await dbService.put('loans', updatedLoan);

      setLoanPayments((prev) => [newPayment, ...prev]);
      setLoans((prev) => prev.map((l) => (l.id === loanId ? updatedLoan : l)));

      notify(
        type === 'extraordinary_capital'
          ? 'Abono extraordinario a capital aplicado con éxito.'
          : 'Pago de cuota registrado.'
      );
    },
    [loans, notify]
  );

  // Subscriptions
  const addSubscription = useCallback(
    async (sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newSub: Subscription = {
        ...sub,
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbService.put('subscriptions', newSub);
      setSubscriptions((prev) => [...prev, newSub]);
      notify('Suscripción agregada.');
    },
    [notify]
  );

  const updateSubscription = useCallback(
    async (sub: Subscription) => {
      const updated: Subscription = { ...sub, updatedAt: new Date().toISOString() };
      await dbService.put('subscriptions', updated);
      setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? updated : s)));
      notify('Suscripción actualizada.');
    },
    [notify]
  );

  const deleteSubscription = useCallback(
    async (id: string) => {
      await dbService.delete('subscriptions', id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      notify('Suscripción eliminada.');
    },
    [notify]
  );

  const toggleSubscriptionPause = useCallback(
    async (id: string) => {
      const target = subscriptions.find((s) => s.id === id);
      if (!target) return;
      const nextStatus = target.status === 'active' ? 'paused' : 'active';
      const updated: Subscription = {
        ...target,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      await dbService.put('subscriptions', updated);
      setSubscriptions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      notify(`Suscripción ${nextStatus === 'paused' ? 'pausada' : 'reactivada'}.`);
    },
    [subscriptions, notify]
  );

  const setSubscriptionMonthException = useCallback(
    async (
      subId: string,
      yearMonth: string,
      exception: { paused?: boolean; overrideAmountCents?: number; overrideDay?: number; note?: string }
    ) => {
      const target = subscriptions.find((s) => s.id === subId);
      if (!target) return;
      const updatedExceptions = { ...(target.exceptionsByMonth || {}), [yearMonth]: exception };
      const updated: Subscription = {
        ...target,
        exceptionsByMonth: updatedExceptions,
        updatedAt: new Date().toISOString(),
      };
      await dbService.put('subscriptions', updated);
      setSubscriptions((prev) => prev.map((s) => (s.id === subId ? updated : s)));
      notify(`Excepción para ${yearMonth} guardada.`);
    },
    [subscriptions, notify]
  );

  // Services
  const addService = useCallback(
    async (serv: Omit<ServiceBill, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newServ: ServiceBill = {
        ...serv,
        id: `serv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbService.put('services', newServ);
      setServices((prev) => [...prev, newServ]);
      notify('Servicio básico registrado.');
    },
    [notify]
  );

  const updateService = useCallback(
    async (serv: ServiceBill) => {
      const updated: ServiceBill = { ...serv, updatedAt: new Date().toISOString() };
      await dbService.put('services', updated);
      setServices((prev) => prev.map((s) => (s.id === serv.id ? updated : s)));
      notify('Servicio actualizado.');
    },
    [notify]
  );

  const deleteService = useCallback(
    async (id: string) => {
      await dbService.delete('services', id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      notify('Servicio eliminado.');
    },
    [notify]
  );

  const updateServiceMonthlyRecord = useCallback(
    async (
      servId: string,
      yearMonth: string,
      record: { actualAmountCents?: number; actualDate?: string; status?: 'planned' | 'paid'; note?: string }
    ) => {
      const target = services.find((s) => s.id === servId);
      if (!target) return;
      const updatedRecords = { ...(target.monthlyRecords || {}), [yearMonth]: record };
      const updated: ServiceBill = {
        ...target,
        monthlyRecords: updatedRecords,
        updatedAt: new Date().toISOString(),
      };
      await dbService.put('services', updated);
      setServices((prev) => prev.map((s) => (s.id === servId ? updated : s)));
      notify('Registro del servicio actualizado para este mes.');
    },
    [services, notify]
  );

  // Budget
  const setCategoryBudget = useCallback(
    async (yearMonth: string, categoryId: string, amountCents: number) => {
      const id = `budget_${yearMonth}_${categoryId}`;
      const budgetItem: Budget = {
        id,
        yearMonth,
        categoryId,
        budgetedAmountCents: amountCents,
      };
      await dbService.put('budgets', budgetItem);
      setBudgets((prev) => {
        const filtered = prev.filter((b) => b.id !== id);
        return [...filtered, budgetItem];
      });
      notify('Presupuesto actualizado.');
    },
    [notify]
  );

  // Copy budgets from previous month
  const copyPreviousMonthBudget = useCallback(
    async (targetYearMonth: string) => {
      const [y, m] = targetYearMonth.split('-').map(Number);
      const prevDate = new Date(y, m - 2, 1);
      const py = prevDate.getFullYear();
      const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const prevYM = `${py}-${pm}`;

      const prevBudgets = budgets.filter((b) => b.yearMonth === prevYM);
      if (prevBudgets.length === 0) {
        notify(`No hay presupuestos registrados en el mes anterior (${prevYM}).`, 'info');
        return;
      }

      for (const pb of prevBudgets) {
        const id = `${targetYearMonth}_${pb.categoryId}`;
        const newBudget: Budget = {
          id,
          yearMonth: targetYearMonth,
          categoryId: pb.categoryId,
          budgetedAmountCents: pb.budgetedAmountCents,
        };
        await dbService.put('budgets', newBudget);
      }

      // Reload budgets from DB
      const allBudgets = await dbService.getAll<Budget>('budgets');
      setBudgets(allBudgets);
      notify(`Presupuesto copiado exitosamente desde ${prevYM} (${prevBudgets.length} categorías).`, 'success');
    },
    [budgets, notify]
  );

  // Initial Position
  const saveInitialPosition = useCallback(
    async (pos: InitialPosition) => {
      await dbService.put('initial_position', { ...pos, id: 'current' });
      setInitialPosition(pos);
      notify('Posición inicial guardada con éxito.');
    },
    [notify]
  );

  // Monthly Close
  const closeMonth = useCallback(
    async (yearMonth: string, notes?: string) => {
      const summary = executiveSummary;
      const closeRecord: MonthlyClose = {
        id: yearMonth,
        yearMonth,
        closedAt: new Date().toISOString(),
        plannedIncomeCents: summary.periodPlannedIncomeCents,
        realIncomeCents: summary.periodRealIncomeCents,
        plannedExpenseCents: summary.periodPlannedExpenseCents,
        realExpenseCents: summary.periodRealExpenseCents,
        plannedSavingsCents: summary.periodPlannedSavingsCents,
        realSavingsCents: summary.periodRealSavingsCents,
        initialBalanceCents: dailyItems[0]?.initialBalanceCents || 0,
        finalBalanceCents: summary.projectedEndPeriodBalanceCents,
        initialDebtCents: summary.totalDebtCents,
        finalDebtCents: summary.totalDebtCents,
        notes,
        isClosed: true,
      };

      await dbService.put('monthly_closes', closeRecord);
      setMonthlyCloses((prev) => [...prev.filter((c) => c.id !== yearMonth), closeRecord]);
      notify(`Mes ${yearMonth} cerrado formalmente.`);
    },
    [executiveSummary, dailyItems, notify]
  );

  const reopenMonth = useCallback(
    async (yearMonth: string) => {
      const target = monthlyCloses.find((c) => c.id === yearMonth);
      if (target) {
        const updated = { ...target, isClosed: false };
        await dbService.put('monthly_closes', updated);
        setMonthlyCloses((prev) => prev.map((c) => (c.id === yearMonth ? updated : c)));
        notify(`Mes ${yearMonth} reabierto para ajustes.`);
      }
    },
    [monthlyCloses, notify]
  );

  // Settings
  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const updated = { ...settings, ...newSettings };
      await dbService.put('settings', { ...updated, id: 'current' });
      setSettings(updated);
      notify('Configuración actualizada.');
    },
    [settings, notify]
  );

  // Backup export & import
  const exportBackup = useCallback(async (): Promise<FullBackupPayload> => {
    const backup = await dbService.exportFullBackup();
    await updateSettings({ lastBackupDate: new Date().toISOString() });
    return backup;
  }, [updateSettings]);

  const importBackup = useCallback(
    async (payload: FullBackupPayload) => {
      await dbService.importFullBackup(payload);
      await loadDatabase();
      notify('Copia de seguridad restaurada exitosamente.');
    },
    [loadDatabase, notify]
  );

  // Load demo data
  const loadDemoData = useCallback(async () => {
    const demo = getRealisticDemoData();
    await dbService.importFullBackup({
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'NEXA Finance',
      data: demo,
    });
    await loadDatabase();
    notify('Datos de demostración cargados.');
  }, [loadDatabase, notify]);

  // Reset all
  const resetAllData = useCallback(
    async (startFresh: boolean) => {
      await dbService.clearEntireDatabase();
      if (startFresh) {
        const clean = getCleanEmptyData();
        await dbService.importFullBackup({
          version: 1,
          exportedAt: new Date().toISOString(),
          app: 'NEXA Finance',
          data: clean,
        });
      }
      await loadDatabase();
      notify(startFresh ? 'Base de datos reiniciada desde cero.' : 'Todos los datos han sido eliminados.');
    },
    [loadDatabase, notify]
  );

  // Export movements as CSV
  const exportMovementsCSV = useCallback(() => {
    if (allTransactionsCombined.length === 0) {
      notify('No hay movimientos para exportar.', 'info');
      return;
    }
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const accMap = new Map(accounts.map((a) => [a.id, a.name]));
    const cardMap = new Map(creditCards.map((c) => [c.id, c.name]));

    const headers = [
      'Fecha',
      'Concepto',
      'Tipo',
      'Categoría',
      'Monto',
      'Cuenta/Tarjeta',
      'Estado',
      'Imprevisto / Sin Presupuesto',
      'Notas',
    ];
    const rows = allTransactionsCombined.map((tx) => {
      const cat = catMap.get(tx.categoryId) || tx.categoryId;
      const origin = tx.creditCardId
        ? cardMap.get(tx.creditCardId) || 'Tarjeta'
        : tx.accountId
        ? accMap.get(tx.accountId) || 'Cuenta'
        : '-';
      const amount = (tx.amountCents / 100).toFixed(2);
      const isUnb = tx.isUnbudgeted ? 'Sí' : 'No';
      return [
        `"${tx.date}"`,
        `"${(tx.concept || '').replace(/"/g, '""')}"`,
        `"${tx.type}"`,
        `"${cat}"`,
        amount,
        `"${origin}"`,
        `"${tx.status}"`,
        `"${isUnb}"`,
        `"${(tx.note || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexa_movimientos_${selectedYearMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Archivo CSV exportado exitosamente.', 'success');
  }, [allTransactionsCombined, categories, accounts, creditCards, selectedYearMonth, notify]);

  // Export Data Backup as downloaded JSON file
  const exportDataBackup = useCallback(async () => {
    try {
      const backup = await exportBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nexa_backup_${getTodayDateString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      notify('Copia de seguridad descargada exitosamente.', 'success');
    } catch {
      notify('Error al generar la copia de seguridad.', 'error');
    }
  }, [exportBackup, notify]);

  return (
    <FinancialContext.Provider
      value={{
        isLoading,
        currentView,
        setCurrentView,
        selectedYear,
        selectedMonth,
        selectedYearMonth,
        setSelectedYearMonth,

        accounts,
        creditCards,
        transactions,
        categories,
        budgets,
        installmentPurchases,
        loans,
        loanPayments,
        subscriptions,
        services,
        initialPosition,
        monthlyCloses,
        settings,

        allTransactionsCombined,
        dailyTimeline: dailyItems,
        accountBalances,
        todayCashBalanceCents,
        executiveSummary,
        monthlySummary: executiveSummary,
        financialAlerts,
        budgetVsReal,
        budgetAnalysis,

        addTransaction,
        updateTransaction,
        deleteTransaction,
        duplicateTransaction,
        toggleTransactionStatus,
        updateTransactionExecution,

        addCategory,
        updateCategory,
        deleteCategory,

        addAccount,
        updateAccount,
        deleteAccount,

        addCreditCard,
        updateCreditCard,
        deleteCreditCard,

        addInstallmentPurchase,
        updateInstallmentPurchase,
        deleteInstallmentPurchase,

        addLoan,
        updateLoan,
        deleteLoan,
        makeLoanPayment,

        addSubscription,
        updateSubscription,
        deleteSubscription,
        toggleSubscriptionPause,
        setSubscriptionMonthException,

        addService,
        updateService,
        deleteService,
        updateServiceMonthlyRecord,

        setCategoryBudget,
        copyPreviousMonthBudget,
        saveInitialPosition,
        closeMonth,
        reopenMonth,
        updateSettings,
        loadDemoData,
        resetAllData,
        exportBackup,
        importBackup,
        exportMovementsCSV,
        exportDataBackup,

        notification,
        notify,
        clearNotification,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export function useFinancial() {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
}
