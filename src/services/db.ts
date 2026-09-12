/**
 * NEXA Finance - Local-First IndexedDB Storage Service
 * Fully offline, persistent, zero recurring cost, zero external cloud dependency.
 */

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
} from '../types';

const DB_NAME = 'nexa_finance_db';
const DB_VERSION = 1;

const STORES = [
  'accounts',
  'credit_cards',
  'transactions',
  'categories',
  'budgets',
  'installment_purchases',
  'loans',
  'loan_payments',
  'subscriptions',
  'services',
  'initial_position',
  'monthly_closes',
  'settings',
] as const;

export type StoreName = typeof STORES[number];

export interface FullBackupPayload {
  version: number;
  exportedAt: string;
  app: 'NEXA Finance';
  data: {
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
    settings: AppSettings | null;
  };
}

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported on this platform.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const storeName of STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getById<T>(storeName: StoreName, id: string): Promise<T | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T extends { id: string }>(storeName: StoreName, item: T): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async putBatch<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(storeName: StoreName, id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName: StoreName): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async exportFullBackup(): Promise<FullBackupPayload> {
    const [
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
      initialPosArr,
      monthlyCloses,
      settingsArr,
    ] = await Promise.all([
      this.getAll<Account>('accounts'),
      this.getAll<CreditCard>('credit_cards'),
      this.getAll<Transaction>('transactions'),
      this.getAll<Category>('categories'),
      this.getAll<Budget>('budgets'),
      this.getAll<InstallmentPurchase>('installment_purchases'),
      this.getAll<Loan>('loans'),
      this.getAll<LoanPayment>('loan_payments'),
      this.getAll<Subscription>('subscriptions'),
      this.getAll<ServiceBill>('services'),
      this.getAll<InitialPosition & { id: string }>('initial_position'),
      this.getAll<MonthlyClose>('monthly_closes'),
      this.getAll<AppSettings & { id: string }>('settings'),
    ]);

    const initialPosition = initialPosArr.length > 0 ? initialPosArr[0] : null;
    const settings = settingsArr.length > 0 ? settingsArr[0] : null;

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'NEXA Finance',
      data: {
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
      },
    };
  }

  async importFullBackup(payload: FullBackupPayload): Promise<void> {
    if (!payload || !payload.data) {
      throw new Error('Formato de backup no válido');
    }

    // Safety: take snapshot before wipe
    try {
      const preSnapshot = await this.exportFullBackup();
      localStorage.setItem('nexa_pre_import_emergency_backup', JSON.stringify(preSnapshot));
    } catch {
      // Ignore fallback snapshot error if storage quota is tight
    }

    // Clear all stores
    await Promise.all(STORES.map((s) => this.clear(s)));

    const {
      accounts = [],
      creditCards = [],
      transactions = [],
      categories = [],
      budgets = [],
      installmentPurchases = [],
      loans = [],
      loanPayments = [],
      subscriptions = [],
      services = [],
      initialPosition,
      monthlyCloses = [],
      settings,
    } = payload.data;

    await Promise.all([
      this.putBatch('accounts', accounts),
      this.putBatch('credit_cards', creditCards),
      this.putBatch('transactions', transactions),
      this.putBatch('categories', categories),
      this.putBatch('budgets', budgets),
      this.putBatch('installment_purchases', installmentPurchases),
      this.putBatch('loans', loans),
      this.putBatch('loan_payments', loanPayments),
      this.putBatch('subscriptions', subscriptions),
      this.putBatch('services', services),
      this.putBatch('monthly_closes', monthlyCloses),
      initialPosition ? this.put('initial_position', { ...initialPosition, id: 'current' }) : Promise.resolve(),
      settings ? this.put('settings', { ...settings, id: 'current' }) : Promise.resolve(),
    ]);
  }

  async clearEntireDatabase(): Promise<void> {
    await Promise.all(STORES.map((s) => this.clear(s)));
  }
}

export const dbService = new StorageService();
