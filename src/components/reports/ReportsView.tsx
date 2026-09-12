import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Download,
  Percent,
  Calendar,
  FileSpreadsheet,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import { formatMoney } from '../../services/financialEngine';

export const ReportsView: React.FC = () => {
  const {
    monthlySummary,
    budgetVsReal,
    creditCards,
    loans,
    installmentPurchases,
    dailyTimeline,
    allTransactionsCombined,
    selectedYearMonth,
    selectedYear,
    settings,
    exportDataBackup,
    exportMovementsCSV,
  } = useFinancial();

  const [chartTab, setChartTab] = useState<'monthly' | 'cumulative' | 'daily' | 'categories'>('monthly');

  // Savings rate calculation
  const savingsRate = useMemo(() => {
    const income = monthlySummary.realIncomeCents + monthlySummary.plannedIncomeCents;
    const expense = monthlySummary.realExpenseCents + monthlySummary.plannedExpenseCents;
    if (income <= 0) return 0;
    return ((income - expense) / income) * 100;
  }, [monthlySummary]);

  // Total Debt calculation
  const totalDebtCents = useMemo(() => {
    let debt = 0;
    creditCards.forEach((c) => (debt += c.currentUsedBalanceCents));
    loans.forEach((l) => (debt += l.currentPendingBalanceCents));
    installmentPurchases.forEach(
      (p) => (debt += p.remainingInstallmentsCount * p.installmentValueCents)
    );
    return debt;
  }, [creditCards, loans, installmentPurchases]);

  const debtRatio = useMemo(() => {
    const monthlyIncome = monthlySummary.realIncomeCents + monthlySummary.plannedIncomeCents;
    if (monthlyIncome <= 0) return 0;
    return (totalDebtCents / monthlyIncome) * 100;
  }, [totalDebtCents, monthlySummary]);

  // Días con saldo más bajo
  const lowestBalanceDays = useMemo(() => {
    return [...dailyTimeline]
      .sort((a, b) => a.finalBalanceCents - b.finalBalanceCents)
      .slice(0, 3);
  }, [dailyTimeline]);

  // Categories distribution
  const sortedCategories = useMemo(() => {
    return [...budgetVsReal]
      .filter((b) => b.totalProjectedSpentCents > 0)
      .sort((a, b) => b.totalProjectedSpentCents - a.totalProjectedSpentCents);
  }, [budgetVsReal]);

  const totalSpentAllCategories = useMemo(() => {
    return sortedCategories.reduce((acc, c) => acc + c.totalProjectedSpentCents, 0);
  }, [sortedCategories]);

  // 1. Monthly Chart Data (Months of the year: Jan to Dec)
  const annualMonthlyData = useMemo(() => {
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];

    let runningCumulativeSavings = 0;
    let runningCumulativeIncome = 0;
    let runningCumulativeExpense = 0;

    return monthNames.map((name, index) => {
      const monthNum = String(index + 1).padStart(2, '0');
      const yearMonthKey = `${selectedYear}-${monthNum}`;

      // Filter transactions for this month
      const txs = allTransactionsCombined.filter((t) => {
        const txMonth = (t.date || t.expectedDate || '').slice(0, 7);
        return txMonth === yearMonthKey;
      });

      let incomeCents = 0;
      let expenseCents = 0;

      txs.forEach((t) => {
        if (t.type === 'income') {
          incomeCents += t.status === 'completed' ? (t.actualAmountCents ?? t.amountCents) : t.amountCents;
        } else if (t.type !== 'transfer') {
          expenseCents += t.status === 'completed' ? (t.actualAmountCents ?? t.amountCents) : t.amountCents;
        }
      });

      // Default sample values if early in year with no data yet so chart displays nicely
      if (yearMonthKey === selectedYearMonth && incomeCents === 0 && expenseCents === 0) {
        incomeCents = monthlySummary.plannedIncomeCents + monthlySummary.realIncomeCents;
        expenseCents = monthlySummary.plannedExpenseCents + monthlySummary.realExpenseCents;
      }

      const incomeVal = incomeCents / 100;
      const expenseVal = expenseCents / 100;
      const netSavingsVal = incomeVal - expenseVal;

      runningCumulativeIncome += incomeVal;
      runningCumulativeExpense += expenseVal;
      runningCumulativeSavings += netSavingsVal;

      return {
        month: name,
        yearMonth: yearMonthKey,
        Ingresos: Number(incomeVal.toFixed(2)),
        Gastos: Number(expenseVal.toFixed(2)),
        AhorroNeto: Number(netSavingsVal.toFixed(2)),
        AhorroAcumulado: Number(runningCumulativeSavings.toFixed(2)),
        IngresosAcumulados: Number(runningCumulativeIncome.toFixed(2)),
        GastosAcumulados: Number(runningCumulativeExpense.toFixed(2)),
      };
    });
  }, [allTransactionsCombined, selectedYear, selectedYearMonth, monthlySummary]);

  // 2. Daily Evolution Data for current month
  const dailyChartData = useMemo(() => {
    return dailyTimeline
      .filter((d) => d.date.startsWith(selectedYearMonth))
      .map((d) => ({
        day: d.date.slice(8), // Just day number '01', '02'
        date: d.date,
        Saldo: Number((d.finalBalanceCents / 100).toFixed(2)),
        Ingresos: Number((d.incomeCents / 100).toFixed(2)),
        Egresos: Number((d.expenseCents / 100).toFixed(2)),
      }));
  }, [dailyTimeline, selectedYearMonth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Reportes Financieros, Gráficas y Analítica
          </h2>
          <p className="text-xs text-slate-400">
            Visualización gráfica mensual y acumulada, tasas de ahorro, endeudamiento y exportaciones
          </p>
        </div>

        {/* Quick export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportMovementsCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={exportDataBackup}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Backup JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tasa de Ahorro */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tasa de Ahorro Mensual</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-2xl font-black font-mono-nums ${
              savingsRate >= 20
                ? 'text-emerald-400'
                : savingsRate >= 0
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {savingsRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500">
            {savingsRate >= 20
              ? 'Excelente: Superas el 20% recomendado de ahorro'
              : savingsRate >= 0
              ? 'Moderado: Se recomienda incrementar al menos a 20%'
              : 'Déficit: Gastos y obligaciones superan los ingresos proyectados'}
          </p>
        </div>

        {/* Nivel de Endeudamiento */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Nivel de Endeudamiento Total</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black font-mono-nums text-white">
            {debtRatio.toFixed(0)}%
          </div>
          <p className="text-[11px] text-slate-500">
            Deuda viva: {formatMoney(totalDebtCents, settings.currencySymbol)} (Tarjetas + Préstamos + Cuotas)
          </p>
        </div>

        {/* Días con saldo más bajo */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Días con Menor Liquidez</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="space-y-1 pt-1 text-xs font-mono-nums">
            {lowestBalanceDays.map((d) => (
              <div key={d.date} className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">{d.date}:</span>
                <span
                  className={`font-bold ${
                    d.finalBalanceCents < 0 ? 'text-rose-400' : 'text-slate-100'
                  }`}
                >
                  {formatMoney(d.finalBalanceCents, settings.currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Charts Section with Tabs */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-5 shadow-sm">
        {/* Chart View Switcher Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Gráficas Financieras Interactivas</span>
            </h3>
            <span className="text-xs text-slate-400">
              Visualiza el comportamiento de tus ingresos, gastos y ahorro en tiempo real
            </span>
          </div>

          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setChartTab('monthly')}
              className={`px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                chartTab === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mes a Mes
            </button>
            <button
              onClick={() => setChartTab('cumulative')}
              className={`px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                chartTab === 'cumulative' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Acumuladas
            </button>
            <button
              onClick={() => setChartTab('daily')}
              className={`px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                chartTab === 'daily' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Línea Diaria ({selectedYearMonth})
            </button>
            <button
              onClick={() => setChartTab('categories')}
              className={`px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                chartTab === 'categories' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Categorías
            </button>
          </div>
        </div>

        {/* 1. Monthly Chart: Bars for Income vs Expenses vs Net Savings */}
        {chartTab === 'monthly' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400 px-2">
              <span>Comparativa de Ingresos vs Gastos vs Ahorro Neto ({selectedYear})</span>
              <span className="text-[11px] font-mono">Valores en {settings.currency} ({settings.currencySymbol})</span>
            </div>
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar dataKey="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="AhorroNeto" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 2. Cumulative Chart: Area of Cumulative Savings and Income */}
        {chartTab === 'cumulative' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400 px-2">
              <span>Evolución del Ahorro Neto Acumulado a lo largo de {selectedYear}</span>
              <span className="text-[11px] font-mono">Curva de crecimiento patrimonial</span>
            </div>
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={annualMonthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="AhorroAcumulado"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSavings)"
                  />
                  <Area
                    type="monotone"
                    dataKey="IngresosAcumulados"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 3. Daily Liquidity Line Chart */}
        {chartTab === 'daily' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400 px-2">
              <span>Proyección y Evolución Diaria del Saldo en Cuenta ({selectedYearMonth})</span>
              <span className="text-[11px] font-mono">Monitoreo de liquidez día a día</span>
            </div>
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="Saldo"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 4. Category Breakdown */}
        {chartTab === 'categories' && (
          <div className="space-y-4 pt-1">
            <div className="flex justify-between items-center text-xs text-slate-400 px-2">
              <span>Distribución de Gastos por Categoría</span>
              <span className="font-mono font-bold text-white">
                Total: {formatMoney(totalSpentAllCategories, settings.currencySymbol)}
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {sortedCategories.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No hay gastos registrados ni presupuestados en este período.
                </p>
              ) : (
                sortedCategories.map((item) => {
                  const share =
                    totalSpentAllCategories > 0
                      ? (item.totalProjectedSpentCents / totalSpentAllCategories) * 100
                      : 0;

                  return (
                    <div key={item.category.id} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.category.color }}
                          />
                          <span className="font-semibold text-slate-200">{item.category.name}</span>
                        </div>

                        <div className="flex items-center gap-3 font-mono-nums">
                          <span className="text-slate-400">{share.toFixed(1)}%</span>
                          <span className="font-bold text-white">
                            {formatMoney(item.totalProjectedSpentCents, settings.currencySymbol)}
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${share}%`,
                            backgroundColor: item.category.color || '#3B82F6',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
