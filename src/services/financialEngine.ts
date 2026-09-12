/**
 * NEXA Finance - Central Financial Calculation & Event Engine
 * Handles daily cash flow forecasting, credit card isolation, loan capital deduction,
 * dynamic projections through 2030, budget vs real variance, and liquidity analysis.
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
  DailyCashFlowItem,
  ExecutiveSummary,
  FinancialAlert,
  CategoryBudgetAnalysis,
  BudgetAnalysisSummary,
  RebalanceSuggestion,
  BudgetStatus,
} from '../types';

// Helper: format money from integer cents to clean string
export function formatMoney(cents: number, symbol: string = '$'): string {
  const isNegative = cents < 0;
  const absVal = Math.abs(cents);
  const dollars = (absVal / 100).toFixed(2);
  const parts = dollars.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `${symbol}${parts.join('.')}`;
  return isNegative ? `-${formatted}` : formatted;
}

// Convert float or input string to integer cents safely
export function toCents(amount: number | string): number {
  if (typeof amount === 'string') {
    const clean = amount.replace(/[^0-9.-]/g, '');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.round(val * 100);
  }
  return Math.round(amount * 100);
}

// Format integer cents to input field string (e.g. 1050 -> "10.50")
export function centsToInputString(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Date helpers (strictly UTC/ISO format YYYY-MM-DD)
export function getTodayDateString(): string {
  // Use local date formatted as YYYY-MM-DD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDateString(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateString(d);
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex, 1).getDay();
}

export function getPreviousMonthString(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const py = prevDate.getFullYear();
  const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
  return `${py}-${pm}`;
}

export function getNextMonthString(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const nextDate = new Date(y, m, 1);
  const ny = nextDate.getFullYear();
  const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

export function getMonthYearString(dateStr: string): string {
  return dateStr.slice(0, 7); // 'YYYY-MM'
}

export function getMonthName(monthIndex: number, locale: string = 'es-ES'): string {
  const date = new Date(2026, monthIndex, 1);
  return date.toLocaleString(locale, { month: 'short' }).toUpperCase().replace('.', '');
}

export function getFullMonthName(monthIndex: number, locale: string = 'es-ES'): string {
  const date = new Date(2026, monthIndex, 1);
  const name = date.toLocaleString(locale, { month: 'long' });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getDayOfWeekName(dateStr: string, locale: string = 'es-ES'): string {
  const d = parseDateString(dateStr);
  return d.toLocaleString(locale, { weekday: 'short' });
}

export function getFullDateDisplay(dateStr: string, locale: string = 'es-ES'): string {
  const d = parseDateString(dateStr);
  return d.toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * GENERATE PROJECTION EVENTS
 * Synthesizes future recurring financial obligations (subscriptions, services,
 * installment purchases, loan installments) up to target date without duplicating manual entries.
 */
export function generateProjectedEvents(
  startDateStr: string,
  endDateStr: string,
  subscriptions: Subscription[],
  services: ServiceBill[],
  installmentPurchases: InstallmentPurchase[],
  loans: Loan[],
  existingTransactions: Transaction[]
): Transaction[] {
  const generated: Transaction[] = [];
  const existingKeys = new Set<string>();

  for (const tx of existingTransactions) {
    if (tx.origin) {
      existingKeys.add(`${tx.origin}_${tx.date}`);
    }
  }

  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);

  // 1. Subscriptions
  for (const sub of subscriptions) {
    if (sub.status === 'cancelled') continue;

    // Loop through each month from start to end
    let curr = new Date(start.getFullYear(), start.getMonth(), 1);
    while (curr <= end) {
      const yearMonth = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
      const exception = sub.exceptionsByMonth ? sub.exceptionsByMonth[yearMonth] : undefined;

      // Check if paused globally or for this specific month
      const isPaused = sub.status === 'paused' || exception?.paused;
      if (!isPaused) {
        const amountCents = exception?.overrideAmountCents ?? sub.amountCents;
        const billingDay = exception?.overrideDay ?? sub.billingDay;
        const maxDays = getDaysInMonth(curr.getFullYear(), curr.getMonth() + 1);
        const day = Math.min(billingDay, maxDays);
        const eventDate = `${yearMonth}-${String(day).padStart(2, '0')}`;

        if (eventDate >= startDateStr && eventDate <= endDateStr) {
          const originKey = `subscription:${sub.id}`;
          const dedupKey = `${originKey}_${eventDate}`;

          if (!existingKeys.has(dedupKey)) {
            generated.push({
              id: `gen_sub_${sub.id}_${eventDate}`,
              date: eventDate,
              expectedDate: eventDate,
              concept: `Suscripción: ${sub.concept}`,
              note: `Generado automáticamente por NEXA Engine (${sub.frequency === 'monthly' ? 'Mensual' : 'Anual'})`,
              categoryId: sub.categoryId,
              type: 'subscription',
              amountCents,
              accountId: sub.paymentMethodType === 'account' ? sub.paymentMethodId : undefined,
              creditCardId: sub.paymentMethodType === 'credit_card' ? sub.paymentMethodId : undefined,
              status: 'planned',
              origin: originKey,
              relatedObligationId: sub.id,
              isGenerated: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      // Next month
      curr.setMonth(curr.getMonth() + 1);
    }
  }

  // 2. Services (Servicios básicos)
  for (const serv of services) {
    if (!serv.active) continue;

    let curr = new Date(start.getFullYear(), start.getMonth(), 1);
    while (curr <= end) {
      const yearMonth = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`;
      const record = serv.monthlyRecords ? serv.monthlyRecords[yearMonth] : undefined;

      // If record is already paid or custom, use that, else default planned
      const amountCents = record?.actualAmountCents ?? serv.budgetedAmountCents;
      const maxDays = getDaysInMonth(curr.getFullYear(), curr.getMonth() + 1);
      const day = Math.min(serv.estimatedDay, maxDays);
      const eventDate = record?.actualDate ?? `${yearMonth}-${String(day).padStart(2, '0')}`;

      if (eventDate >= startDateStr && eventDate <= endDateStr) {
        const originKey = `service:${serv.id}`;
        const dedupKey = `${originKey}_${eventDate}`;

        if (!existingKeys.has(dedupKey)) {
          generated.push({
            id: `gen_serv_${serv.id}_${eventDate}`,
            date: eventDate,
            expectedDate: eventDate,
            concept: `${serv.company} - ${serv.serviceName}`,
            note: 'Factura de servicio básico programada',
            categoryId: serv.categoryId,
            type: 'service',
            amountCents,
            accountId: serv.paymentMethodType === 'account' ? serv.paymentMethodId : undefined,
            creditCardId: serv.paymentMethodType === 'credit_card' ? serv.paymentMethodId : undefined,
            status: record?.status === 'paid' ? 'completed' : 'planned',
            origin: originKey,
            relatedObligationId: serv.id,
            isGenerated: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      curr.setMonth(curr.getMonth() + 1);
    }
  }

  // 3. Installment Purchases (Compras a cuotas en tarjeta)
  for (const inst of installmentPurchases) {
    const remainingCount = inst.totalInstallments - inst.paidInstallmentsCount;
    if (remainingCount <= 0) continue;

    let nextDueDate = parseDateString(inst.firstPaymentDate);
    // Advance to remaining installments
    for (let i = 0; i < inst.paidInstallmentsCount; i++) {
      if (inst.frequency === 'monthly') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      } else {
        nextDueDate.setDate(nextDueDate.getDate() + 14);
      }
    }

    for (let i = 0; i < remainingCount; i++) {
      const eventDate = formatDateString(nextDueDate);
      if (eventDate >= startDateStr && eventDate <= endDateStr) {
        const originKey = `installment:${inst.id}:${inst.paidInstallmentsCount + i + 1}`;
        const dedupKey = `${originKey}_${eventDate}`;

        if (!existingKeys.has(dedupKey)) {
          generated.push({
            id: `gen_inst_${inst.id}_${inst.paidInstallmentsCount + i + 1}`,
            date: eventDate,
            expectedDate: eventDate,
            concept: `Cuota ${inst.paidInstallmentsCount + i + 1}/${inst.totalInstallments}: ${inst.concept}`,
            note: `Cuota a tarjeta de crédito`,
            categoryId: 'cat_installments',
            type: 'installment_payment',
            amountCents: inst.installmentValueCents,
            creditCardId: inst.creditCardId,
            status: 'planned',
            origin: originKey,
            relatedInstallmentPurchaseId: inst.id,
            isGenerated: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      if (inst.frequency === 'monthly') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      } else {
        nextDueDate.setDate(nextDueDate.getDate() + 14);
      }
    }
  }

  // 4. Loans (Préstamos)
  for (const loan of loans) {
    if (loan.currentPendingBalanceCents <= 0) continue;
    const remainingCount = Math.max(1, loan.totalInstallmentsCount - loan.paidInstallmentsCount);

    let nextDueDate = parseDateString(loan.nextPaymentDate);
    for (let i = 0; i < remainingCount; i++) {
      const eventDate = formatDateString(nextDueDate);
      if (eventDate >= startDateStr && eventDate <= endDateStr) {
        const originKey = `loan:${loan.id}:${loan.paidInstallmentsCount + i + 1}`;
        const dedupKey = `${originKey}_${eventDate}`;

        if (!existingKeys.has(dedupKey)) {
          const installmentAmt = Math.min(loan.installmentAmountCents, loan.currentPendingBalanceCents);
          generated.push({
            id: `gen_loan_${loan.id}_${loan.paidInstallmentsCount + i + 1}`,
            date: eventDate,
            expectedDate: eventDate,
            concept: `Cuota Préstamo: ${loan.name} (${loan.paidInstallmentsCount + i + 1}/${loan.totalInstallmentsCount})`,
            note: `Pago de amortización de préstamo`,
            categoryId: 'cat_loan_payments',
            type: 'loan_payment',
            amountCents: installmentAmt,
            accountId: loan.fromAccountId,
            status: 'planned',
            origin: originKey,
            relatedLoanId: loan.id,
            isGenerated: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      if (loan.frequency === 'monthly') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      } else {
        nextDueDate.setDate(nextDueDate.getDate() + 14);
      }
    }
  }

  return generated;
}

/**
 * CALCULATE DAILY LIQUID CASH FLOW TIMELINE
 * Combines starting liquid positions (Cash + Banks), manual transactions,
 * and projected events day by day.
 */
export function calculateDailyTimeline(
  startDateStr: string,
  endDateStr: string,
  accounts: Account[],
  initialPosition: InitialPosition | null,
  allTransactions: Transaction[]
): {
  dailyItems: DailyCashFlowItem[];
  accountBalances: Record<string, number>;
  todayCashBalanceCents: number;
} {
  const todayStr = getTodayDateString();

  // Initial liquid pool = Cash + Active Banks as of initial position date
  let totalStartingCash = 0;
  const currentAccountBalances: Record<string, number> = {};

  for (const acc of accounts) {
    if (!acc.active) continue;
    let bal = acc.initialBalanceCents;
    if (initialPosition && initialPosition.bankBalances[acc.id] !== undefined) {
      bal = initialPosition.bankBalances[acc.id];
    } else if (acc.type === 'cash' && initialPosition?.cashBalanceCents !== undefined) {
      bal = initialPosition.cashBalanceCents;
    }
    currentAccountBalances[acc.id] = bal;
    totalStartingCash += bal;
  }

  // Filter and sort transactions chronologically
  const activeTx = allTransactions.filter(
    (tx) => tx.status !== 'cancelled' && tx.date >= startDateStr && tx.date <= endDateStr
  );

  // Group transactions by date
  const txByDate = new Map<string, Transaction[]>();
  for (const tx of activeTx) {
    const list = txByDate.get(tx.date) || [];
    list.push(tx);
    txByDate.set(tx.date, list);
  }

  const dailyItems: DailyCashFlowItem[] = [];
  let runningProjectedBalance = totalStartingCash;
  let runningRealBalance = totalStartingCash;

  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);
  const curr = new Date(start);

  while (curr <= end) {
    const dateStr = formatDateString(curr);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const dayOfWeek = getDayOfWeekName(dateStr);
    const dayNumber = curr.getDate();

    const dayInitialBalance = runningProjectedBalance;
    const eventsOfDay = txByDate.get(dateStr) || [];

    let realInflows = 0;
    let projectedInflows = 0;
    let realOutflows = 0;
    let projectedOutflows = 0;
    let obligations = 0;

    for (const tx of eventsOfDay) {
      const isCompleted = tx.status === 'completed';

      // 1. INFLOWS (Only income from cash/bank)
      if (tx.type === 'income') {
        if (isCompleted) {
          realInflows += tx.amountCents;
          runningRealBalance += tx.amountCents;
        } else {
          projectedInflows += tx.amountCents;
        }
        runningProjectedBalance += tx.amountCents;

        if (tx.accountId && currentAccountBalances[tx.accountId] !== undefined) {
          if (isPast || isToday) {
            currentAccountBalances[tx.accountId] += tx.amountCents;
          }
        }
      }

      // 2. EXPENSES from Cash/Bank (Direct cash/debit expense)
      // Note: Credit card purchases DO NOT reduce cash/bank balance!
      else if (
        tx.type === 'expense' ||
        tx.type === 'subscription' ||
        tx.type === 'service' ||
        tx.type === 'credit_card_payment' ||
        tx.type === 'loan_payment' ||
        tx.type === 'installment_payment'
      ) {
        // If it was charged directly to a Credit Card (not bank/cash), it does NOT deplete liquid cash
        const isChargedToCard = !!tx.creditCardId && tx.type !== 'credit_card_payment';

        if (!isChargedToCard) {
          if (isCompleted) {
            realOutflows += tx.amountCents;
            runningRealBalance -= tx.amountCents;
          } else {
            projectedOutflows += tx.amountCents;
          }
          runningProjectedBalance -= tx.amountCents;

          if (tx.accountId && currentAccountBalances[tx.accountId] !== undefined) {
            if (isPast || isToday) {
              currentAccountBalances[tx.accountId] -= tx.amountCents;
            }
          }
        }

        // Obligations tracker (all non-discretionary commitments due that day)
        if (
          tx.type === 'subscription' ||
          tx.type === 'service' ||
          tx.type === 'credit_card_payment' ||
          tx.type === 'loan_payment' ||
          tx.type === 'installment_payment' ||
          tx.relatedObligationId ||
          tx.relatedLoanId
        ) {
          obligations += tx.amountCents;
        }
      }

      // 3. TRANSFERS (Account A -> Account B)
      else if (tx.type === 'transfer') {
        // Does not change total liquid cash, but shifts between accounts
        if (tx.accountId && currentAccountBalances[tx.accountId] !== undefined) {
          currentAccountBalances[tx.accountId] -= tx.amountCents;
        }
        if (tx.toAccountId && currentAccountBalances[tx.toAccountId] !== undefined) {
          currentAccountBalances[tx.toAccountId] += tx.amountCents;
        }
      }
    }

    const hasRisk = runningProjectedBalance < 0;
    const isTight = !hasRisk && runningProjectedBalance < obligations && obligations > 0;

    dailyItems.push({
      date: dateStr,
      dayOfWeek,
      dayNumber,
      isToday,
      isPast,
      initialBalanceCents: dayInitialBalance,
      realInflowsCents: realInflows,
      projectedInflowsCents: projectedInflows,
      realOutflowsCents: realOutflows,
      projectedOutflowsCents: projectedOutflows,
      obligationsCents: obligations,
      projectedFinalBalanceCents: runningProjectedBalance,
      realFinalBalanceCents: isPast || isToday ? runningRealBalance : undefined,
      events: eventsOfDay,
      hasRisk,
      isTight,
    });

    curr.setDate(curr.getDate() + 1);
  }

  // Today's real liquid balance
  const todayItem = dailyItems.find((d) => d.isToday);
  const todayCashBalanceCents = todayItem
    ? todayItem.realFinalBalanceCents ?? todayItem.projectedFinalBalanceCents
    : totalStartingCash;

  return {
    dailyItems,
    accountBalances: currentAccountBalances,
    todayCashBalanceCents,
  };
}

/**
 * CALCULATE EXECUTIVE METRICS & SUMMARY FOR A CHOSEN MONTH
 */
export function calculateExecutiveSummary(
  yearMonth: string, // 'YYYY-MM'
  accounts: Account[],
  creditCards: CreditCard[],
  loans: Loan[],
  dailyItems: DailyCashFlowItem[],
  allTransactions: Transaction[],
  todayCashBalanceCents: number
): ExecutiveSummary {
  const todayStr = getTodayDateString();

  // Filter items in selected month
  const monthItems = dailyItems.filter((d) => d.date.startsWith(yearMonth));
  const monthLastItem = monthItems[monthItems.length - 1];
  const projectedEndPeriodBalanceCents = monthLastItem
    ? monthLastItem.projectedFinalBalanceCents
    : todayCashBalanceCents;

  // Month transactions
  const monthTx = allTransactions.filter(
    (tx) => tx.date.startsWith(yearMonth) && tx.status !== 'cancelled'
  );

  let periodRealIncome = 0;
  let periodPlannedIncome = 0;
  let periodRealExpense = 0;
  let periodPlannedExpense = 0;

  for (const tx of monthTx) {
    if (tx.type === 'income') {
      if (tx.status === 'completed') {
        periodRealIncome += tx.amountCents;
      }
      periodPlannedIncome += tx.amountCents;
    } else if (tx.type === 'expense' || tx.type === 'subscription' || tx.type === 'service') {
      if (tx.status === 'completed') {
        periodRealExpense += tx.amountCents;
      }
      periodPlannedExpense += tx.amountCents;
    }
  }

  // Committed obligations next 30 days from today
  const next30DaysStr = addDays(todayStr, 30);
  const future30DaysItems = dailyItems.filter(
    (d) => d.date >= todayStr && d.date <= next30DaysStr
  );
  let committedObligationsNext30DaysCents = 0;
  for (const day of future30DaysItems) {
    committedObligationsNext30DaysCents += day.obligationsCents;
  }

  const availableAfterCommitmentsCents =
    todayCashBalanceCents - committedObligationsNext30DaysCents;

  // Credit cards and loans debt
  let totalCreditCardsUsed = 0;
  let totalCreditLimit = 0;
  for (const cc of creditCards) {
    if (cc.active) {
      totalCreditCardsUsed += cc.currentUsedBalanceCents;
      totalCreditLimit += cc.creditLimitCents;
    }
  }

  let totalLoansPending = 0;
  for (const l of loans) {
    totalLoansPending += l.currentPendingBalanceCents;
  }

  const totalDebtCents = totalCreditCardsUsed + totalLoansPending;

  // Today obligations
  const todayItem = dailyItems.find((d) => d.isToday);
  const obligationsDueTodayCount = todayItem
    ? todayItem.events.filter((e) => e.type !== 'income' && e.type !== 'transfer' && e.status !== 'completed').length
    : 0;
  const obligationsDueTodayCents = todayItem ? todayItem.obligationsCents : 0;

  // This week obligations (next 7 days)
  const next7DaysStr = addDays(todayStr, 7);
  const weekItems = dailyItems.filter((d) => d.date >= todayStr && d.date <= next7DaysStr);
  let obligationsThisWeekCount = 0;
  let obligationsThisWeekCents = 0;

  for (const day of weekItems) {
    for (const e of day.events) {
      if (e.type !== 'income' && e.type !== 'transfer' && e.status !== 'completed') {
        obligationsThisWeekCount++;
      }
    }
    obligationsThisWeekCents += day.obligationsCents;
  }

  return {
    currentCashBankBalanceCents: todayCashBalanceCents,
    projectedEndPeriodBalanceCents,
    periodRealIncomeCents: periodRealIncome,
    periodPlannedIncomeCents: periodPlannedIncome,
    periodRealExpenseCents: periodRealExpense,
    periodPlannedExpenseCents: periodPlannedExpense,
    periodRealSavingsCents: periodRealIncome - periodRealExpense,
    periodPlannedSavingsCents: periodPlannedIncome - periodPlannedExpense,
    committedObligationsNext30DaysCents,
    availableAfterCommitmentsCents,
    totalDebtCents,
    totalCreditCardsUsedCents: totalCreditCardsUsed,
    totalCreditLimitCents: totalCreditLimit,
    totalLoansPendingCents: totalLoansPending,
    obligationsDueTodayCount,
    obligationsDueTodayCents,
    obligationsThisWeekCount,
    obligationsThisWeekCents,
  };
}

/**
 * CALCULATE FINANCIAL ALERTS
 * Generates proactive, smart notifications for insufficient funds,
 * tight liquidity, and upcoming payments.
 */
export function generateFinancialAlerts(
  dailyItems: DailyCashFlowItem[],
  summary: ExecutiveSummary,
  todayStr: string
): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];

  // 1. Deficit alert: Any future day with negative balance
  const deficitDay = dailyItems.find((d) => d.date >= todayStr && d.hasRisk);
  if (deficitDay) {
    alerts.push({
      id: `deficit_${deficitDay.date}`,
      type: 'insufficient_funds',
      title: 'Riesgo de saldo insuficiente',
      message: `El ${getFullDateDisplay(deficitDay.date)} tu saldo proyectado caería a ${formatMoney(deficitDay.projectedFinalBalanceCents)}. Revisa tus salidas programadas.`,
      severity: 'red',
      date: deficitDay.date,
      actionLabel: 'Ver en flujo de caja',
    });
  }

  // 2. Tight liquidity alert: Obligations next 30 days >= 75% of available cash
  if (
    summary.currentCashBankBalanceCents > 0 &&
    summary.committedObligationsNext30DaysCents >= summary.currentCashBankBalanceCents * 0.75
  ) {
    const pct = Math.round(
      (summary.committedObligationsNext30DaysCents / summary.currentCashBankBalanceCents) * 100
    );
    alerts.push({
      id: 'tight_liquidity_month',
      type: 'tight_liquidity',
      title: 'Liquidez ajustada este mes',
      message: `Tus obligaciones próximas (${formatMoney(summary.committedObligationsNext30DaysCents)}) comprometen el ${pct}% de tu saldo actual.`,
      severity: 'orange',
    });
  }

  // 3. Upcoming today obligations
  if (summary.obligationsDueTodayCount > 0) {
    alerts.push({
      id: 'due_today',
      type: 'upcoming_payment',
      title: 'Obligaciones para hoy',
      message: `Tienes ${summary.obligationsDueTodayCount} compromiso(s) por un total de ${formatMoney(summary.obligationsDueTodayCents)} programados para hoy.`,
      severity: 'yellow',
      date: todayStr,
    });
  }

  // 4. Positive trend / Good cushion
  if (summary.availableAfterCommitmentsCents > 0 && !deficitDay) {
    alerts.push({
      id: 'healthy_liquidity',
      type: 'positive_trend',
      title: 'Posición de liquidez saludable',
      message: `Tienes un excedente libre de ${formatMoney(summary.availableAfterCommitmentsCents)} después de cubrir compromisos de los próximos 30 días.`,
      severity: 'green',
    });
  }

  return alerts;
}

/**
 * "¿PUEDO PAGARLO?" (CAN I AFFORD IT? ANALYZER)
 * Evaluates whether a proposed planned expense is safe given current liquidity
 * and committed future obligations.
 */
export function analyzeAffordability(
  proposedExpenseCents: number,
  currentLiquidBalanceCents: number,
  committedObligationsNext30DaysCents: number
): {
  currentBalanceCents: number;
  proposedExpenseCents: number;
  balanceAfterExpenseCents: number;
  committedObligationsCents: number;
  balanceAfterObligationsCents: number;
  status: 'safe' | 'tight' | 'danger';
  statusLabel: string;
  explanation: string;
} {
  const balanceAfterExpense = currentLiquidBalanceCents - proposedExpenseCents;
  const balanceAfterObligations = balanceAfterExpense - committedObligationsNext30DaysCents;

  let status: 'safe' | 'tight' | 'danger' = 'safe';
  let statusLabel = '🟢 Puede realizarse';
  let explanation =
    'Tu liquidez actual y proyecciones cubren este gasto sin poner en riesgo tus obligaciones futuras.';

  if (balanceAfterExpense < 0 || balanceAfterObligations < 0) {
    status = 'danger';
    statusLabel = '🔴 Riesgo de saldo insuficiente';
    explanation = `Realizar este gasto compromete pagos futuros. Te faltarían ${formatMoney(Math.abs(balanceAfterObligations))} para cubrir tus compromisos del mes.`;
  } else if (balanceAfterObligations < committedObligationsNext30DaysCents * 0.2) {
    status = 'tight';
    statusLabel = '🟠 Liquidez ajustada';
    explanation = `Puedes realizar el gasto, pero dejarás un margen muy estrecho (${formatMoney(balanceAfterObligations)}) para contingencias antes de tus próximos pagos.`;
  }

  return {
    currentBalanceCents: currentLiquidBalanceCents,
    proposedExpenseCents,
    balanceAfterExpenseCents: balanceAfterExpense,
    committedObligationsCents: committedObligationsNext30DaysCents,
    balanceAfterObligationsCents: balanceAfterObligations,
    status,
    statusLabel,
    explanation,
  };
}

/**
 * CALCULATE CREDIT CARD SIMULATION IMPACT
 * Evaluates impact of charging a new purchase to a credit card
 */
export function simulateCreditCardPurchase(
  card: CreditCard,
  purchaseAmountCents: number
): {
  beforeUsedCents: number;
  beforeAvailableCents: number;
  afterUsedCents: number;
  afterAvailableCents: number;
  beforeUtilizationPct: number;
  afterUtilizationPct: number;
  exceedsLimit: boolean;
} {
  const beforeUsed = card.currentUsedBalanceCents;
  const beforeAvailable = Math.max(0, card.creditLimitCents - beforeUsed);
  const afterUsed = beforeUsed + purchaseAmountCents;
  const afterAvailable = Math.max(0, card.creditLimitCents - afterUsed);

  const beforeUtilizationPct = card.creditLimitCents > 0
    ? Math.round((beforeUsed / card.creditLimitCents) * 100)
    : 0;
  const afterUtilizationPct = card.creditLimitCents > 0
    ? Math.round((afterUsed / card.creditLimitCents) * 100)
    : 0;

  return {
    beforeUsedCents: beforeUsed,
    beforeAvailableCents: beforeAvailable,
    afterUsedCents: afterUsed,
    afterAvailableCents: afterAvailable,
    beforeUtilizationPct,
    afterUtilizationPct,
    exceedsLimit: afterUsed > card.creditLimitCents,
  };
}

/**
 * CALCULATE COMPREHENSIVE BUDGET VS REAL ANALYSIS
 * Evaluates savings, overruns, unbudgeted expenses, run-rate burn speed,
 * category breakdowns with transaction drill-downs, and rebalance opportunities.
 */
export function calculateComprehensiveBudgetAnalysis(
  yearMonth: string,
  categories: Category[],
  budgets: Budget[],
  transactions: Transaction[],
  todayStr: string = getTodayDateString()
): {
  items: CategoryBudgetAnalysis[];
  summary: BudgetAnalysisSummary;
} {
  const monthTx = transactions.filter(
    (tx) =>
      tx.date.startsWith(yearMonth) &&
      tx.status !== 'cancelled' &&
      tx.type !== 'income' &&
      tx.type !== 'transfer' &&
      tx.type !== 'credit_card_payment'
  );

  const budgetMap = new Map<string, number>();
  for (const b of budgets) {
    if (b.yearMonth === yearMonth) {
      budgetMap.set(b.categoryId, b.budgetedAmountCents);
    }
  }

  const realTxMap = new Map<string, Transaction[]>();
  const plannedTxMap = new Map<string, Transaction[]>();
  const allCatTxMap = new Map<string, Transaction[]>();

  for (const tx of monthTx) {
    const list = allCatTxMap.get(tx.categoryId) || [];
    list.push(tx);
    allCatTxMap.set(tx.categoryId, list);

    if (tx.status === 'completed') {
      const rList = realTxMap.get(tx.categoryId) || [];
      rList.push(tx);
      realTxMap.set(tx.categoryId, rList);
    } else {
      const pList = plannedTxMap.get(tx.categoryId) || [];
      pList.push(tx);
      plannedTxMap.set(tx.categoryId, pList);
    }
  }

  // Identify unbudgeted transactions
  // A transaction is unbudgeted if it is explicitly flagged isUnbudgeted OR its category budget is 0
  const unbudgetedTransactions: Transaction[] = [];
  let totalUnbudgetedCents = 0;

  for (const tx of monthTx) {
    const catBudget = budgetMap.get(tx.categoryId) || 0;
    if (tx.isUnbudgeted || catBudget === 0) {
      unbudgetedTransactions.push(tx);
      if (tx.status === 'completed') {
        totalUnbudgetedCents += tx.amountCents;
      }
    }
  }

  const items: CategoryBudgetAnalysis[] = categories
    .filter((c) => c.type === 'expense')
    .map((category) => {
      const budgetedCents = budgetMap.get(category.id) || 0;
      const catRealTx = realTxMap.get(category.id) || [];
      const catPlannedTx = plannedTxMap.get(category.id) || [];
      const catAllTx = allCatTxMap.get(category.id) || [];

      const realSpentCents = catRealTx.reduce((acc, t) => acc + t.amountCents, 0);
      const plannedPendingCents = catPlannedTx.reduce((acc, t) => acc + t.amountCents, 0);
      const totalProjectedCents = realSpentCents + plannedPendingCents;

      const varianceCents = budgetedCents - realSpentCents;
      const projectedVarianceCents = budgetedCents - totalProjectedCents;

      const percentUsed = budgetedCents > 0 ? (realSpentCents / budgetedCents) * 100 : 0;
      const percentProjected = budgetedCents > 0 ? (totalProjectedCents / budgetedCents) * 100 : 0;

      const isOverBudget = budgetedCents > 0 && totalProjectedCents > budgetedCents;
      const isUnbudgeted = budgetedCents === 0 && totalProjectedCents > 0;

      let savingsCents = 0;
      let overrunCents = 0;

      if (budgetedCents > 0) {
        if (totalProjectedCents < budgetedCents) {
          savingsCents = budgetedCents - totalProjectedCents;
        } else if (totalProjectedCents > budgetedCents) {
          overrunCents = totalProjectedCents - budgetedCents;
        }
      } else if (totalProjectedCents > 0) {
        overrunCents = totalProjectedCents;
      }

      let status: BudgetStatus = 'on_track';
      let statusLabel = 'En Meta';

      if (budgetedCents === 0) {
        if (totalProjectedCents > 0) {
          status = 'unbudgeted';
          statusLabel = 'Fuera de Presupuesto';
        } else {
          status = 'zero_spent';
          statusLabel = 'Sin Asignar';
        }
      } else if (isOverBudget || realSpentCents > budgetedCents) {
        status = 'over_budget';
        statusLabel = 'Sobregiro';
      } else if (totalProjectedCents >= budgetedCents * 0.8) {
        status = 'warning';
        statusLabel = 'Al Límite (>80%)';
      } else if (savingsCents > 0) {
        status = 'savings';
        statusLabel = 'Con Ahorro';
      }

      return {
        category,
        budgetedCents,
        realSpentCents,
        plannedPendingCents,
        totalProjectedCents,
        savingsCents,
        overrunCents,
        varianceCents,
        projectedVarianceCents,
        percentUsed,
        percentProjected,
        status,
        statusLabel,
        isOverBudget,
        isUnbudgeted,
        transactions: catAllTx,
        realTransactions: catRealTx,
        plannedTransactions: catPlannedTx,
      };
    })
    .sort((a, b) => {
      // Prioritize categories with budget or activity
      if (a.budgetedCents > 0 && b.budgetedCents === 0) return -1;
      if (b.budgetedCents > 0 && a.budgetedCents === 0) return 1;
      return b.budgetedCents - a.budgetedCents || b.realSpentCents - a.realSpentCents;
    });

  // Calculate summary metrics
  let totalBudgetedCents = 0;
  let totalRealCents = 0;
  let totalPlannedPendingCents = 0;
  let totalProjectedCents = 0;
  let grossSavingsCents = 0;
  let grossOverrunCents = 0;
  let categoriesWithSavingsCount = 0;
  let categoriesOverBudgetCount = 0;
  let categoriesAtLimitCount = 0;
  let totalCategoriesWithBudget = 0;

  for (const item of items) {
    totalBudgetedCents += item.budgetedCents;
    totalRealCents += item.realSpentCents;
    totalPlannedPendingCents += item.plannedPendingCents;
    totalProjectedCents += item.totalProjectedCents;

    if (item.budgetedCents > 0) {
      totalCategoriesWithBudget++;
      if (item.savingsCents > 0) {
        grossSavingsCents += item.savingsCents;
        categoriesWithSavingsCount++;
      }
      if (item.overrunCents > 0) {
        grossOverrunCents += item.overrunCents;
        categoriesOverBudgetCount++;
      }
      if (item.status === 'warning') {
        categoriesAtLimitCount++;
      }
    }
  }

  // Net savings = total budgeted - total projected
  const netSavingsCents = totalBudgetedCents - totalProjectedCents;

  const disciplineRate = totalCategoriesWithBudget > 0
    ? Math.round(((totalCategoriesWithBudget - categoriesOverBudgetCount) / totalCategoriesWithBudget) * 100)
    : 100;

  // Calendar progress in month
  const [y, m] = yearMonth.split('-').map(Number);
  const totalDaysInMonth = getDaysInMonth(y, m - 1);
  const currentYM = todayStr.substring(0, 7);
  let daysElapsedInMonth = totalDaysInMonth;
  if (yearMonth === currentYM) {
    const todayDay = parseInt(todayStr.substring(8, 10), 10);
    daysElapsedInMonth = Math.min(totalDaysInMonth, Math.max(1, todayDay));
  } else if (yearMonth > currentYM) {
    daysElapsedInMonth = 0;
  }

  const monthProgressPct = totalDaysInMonth > 0
    ? Math.min(100, Math.round((daysElapsedInMonth / totalDaysInMonth) * 100))
    : 0;

  const expectedRunRateCents = Math.round(totalBudgetedCents * (daysElapsedInMonth / totalDaysInMonth));
  const burnRateDiffCents = totalRealCents - expectedRunRateCents;

  // Rebalance suggestions: match categories with savings to categories with overruns
  const rebalanceSuggestions: RebalanceSuggestion[] = [];
  const surplusCategories = items
    .filter((it) => it.savingsCents > 0)
    .sort((a, b) => b.savingsCents - a.savingsCents);
  const deficitCategories = items
    .filter((it) => it.overrunCents > 0)
    .sort((a, b) => b.overrunCents - a.overrunCents);

  for (const deficit of deficitCategories) {
    const needed = deficit.overrunCents;
    const bestDonor = surplusCategories.find((s) => s.savingsCents >= 100);
    if (bestDonor) {
      const transferAmount = Math.min(bestDonor.savingsCents, needed);
      rebalanceSuggestions.push({
        fromCategoryId: bestDonor.category.id,
        fromCategoryName: bestDonor.category.name,
        availableSavingsCents: bestDonor.savingsCents,
        toCategoryId: deficit.category.id,
        toCategoryName: deficit.category.name,
        neededCents: transferAmount,
      });
    }
  }

  const summary: BudgetAnalysisSummary = {
    totalBudgetedCents,
    totalRealCents,
    totalPlannedPendingCents,
    totalProjectedCents,
    grossSavingsCents,
    grossOverrunCents,
    netSavingsCents,
    totalUnbudgetedCents,
    unbudgetedCount: unbudgetedTransactions.length,
    unbudgetedTransactions,
    disciplineRate,
    totalCategoriesWithBudget,
    categoriesWithSavingsCount,
    categoriesOverBudgetCount,
    categoriesAtLimitCount,
    daysElapsedInMonth,
    totalDaysInMonth,
    monthProgressPct,
    expectedRunRateCents,
    burnRateDiffCents,
    rebalanceSuggestions,
  };

  return {
    items,
    summary,
  };
}

/**
 * CALCULATE BUDGET VS REAL BY CATEGORY FOR A GIVEN MONTH
 * Returns CategoryBudgetAnalysis array with backwards-compatible aliases
 */
export function calculateBudgetVsReal(
  yearMonth: string,
  categories: Category[],
  budgets: Budget[],
  transactions: Transaction[]
): Array<
  CategoryBudgetAnalysis & {
    budgetedAmountCents: number;
    realCents: number;
    plannedCents: number;
    totalProjectedSpentCents: number;
  }
> {
  const { items } = calculateComprehensiveBudgetAnalysis(yearMonth, categories, budgets, transactions);

  return items.map((it) => ({
    ...it,
    budgetedAmountCents: it.budgetedCents,
    realCents: it.realSpentCents,
    plannedCents: it.plannedPendingCents,
    totalProjectedSpentCents: it.totalProjectedCents,
  }));
}

