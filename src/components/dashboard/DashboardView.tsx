import React, { useMemo, useState } from 'react';
import {
  Wallet,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Landmark,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  PiggyBank,
  DollarSign,
  Table,
  FileSpreadsheet,
  Tag,
  BarChart3,
  CheckSquare,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatMoney, getTodayDateString } from '../../services/financialEngine';
import { CanIAffordModal } from '../common/CanIAffordModal';
import { QuickMovementModal } from '../common/QuickMovementModal';

export const DashboardView: React.FC = () => {
  const {
    accounts,
    creditCards,
    loans,
    accountBalances,
    todayCashBalanceCents,
    executiveSummary,
    financialAlerts,
    dailyTimeline,
    allTransactionsCombined,
    toggleTransactionStatus,
    setCurrentView,
    settings,
    selectedYearMonth,
  } = useFinancial();

  const [isAffordModalOpen, setIsAffordModalOpen] = useState(false);
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Today's pending obligations
  const todayTransactions = useMemo(() => {
    return allTransactionsCombined.filter((t) => t.date === todayStr);
  }, [allTransactionsCombined, todayStr]);

  // Next 7 days transactions
  const next7DaysTransactions = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayISO = today.toISOString().split('T')[0];
    const nextWeekISO = nextWeek.toISOString().split('T')[0];

    return allTransactionsCombined.filter(
      (t) => t.date >= todayISO && t.date <= nextWeekISO && t.status === 'planned'
    );
  }, [allTransactionsCombined]);

  // Next 30 days projection for the mini chart
  const next30DaysDaily = useMemo(() => {
    return dailyTimeline.slice(0, 30);
  }, [dailyTimeline]);

  // Min and max balance in the next 30 days for SVG chart scaling
  const chartBounds = useMemo(() => {
    if (next30DaysDaily.length === 0) return { min: 0, max: 100000 };
    let min = Infinity;
    let max = -Infinity;
    next30DaysDaily.forEach((d) => {
      if (d.finalBalanceCents < min) min = d.finalBalanceCents;
      if (d.finalBalanceCents > max) max = d.finalBalanceCents;
    });
    if (min > 0) min = 0;
    if (max <= min) max = min + 10000;
    return { min, max };
  }, [next30DaysDaily]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Proactive Alerts Section (Prompt #5.6) */}
      {financialAlerts.length > 0 && (
        <div className="space-y-2">
          {financialAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl p-4 border flex items-start justify-between gap-3 text-xs backdrop-blur-md shadow-sm ${
                alert.level === 'danger'
                  ? 'bg-rose-950/60 border-rose-500/30 text-rose-200'
                  : alert.level === 'warning'
                  ? 'bg-amber-950/60 border-amber-500/30 text-amber-200'
                  : 'bg-blue-950/60 border-blue-500/30 text-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {alert.level === 'danger' ? (
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                ) : alert.level === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm text-white">{alert.title}</h4>
                  <p className="mt-0.5 text-slate-300 leading-relaxed">{alert.message}</p>
                </div>
              </div>
              {alert.actionView && (
                <button
                  onClick={() => setCurrentView(alert.actionView! as any)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-white border border-slate-700 transition cursor-pointer flex-shrink-0"
                >
                  Ver detalle
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Acceso Directo a Nuevos Módulos y Análisis Solicitados */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-indigo-950/40 border border-blue-500/30 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Nuevos Módulos de Análisis Financiero
            </h3>
            <p className="text-xs text-slate-400">
              Explora las nuevas herramientas de control matricial, extractos y gestión de catálogos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <button
            onClick={() => setCurrentView('matrix')}
            className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-blue-400">
              <Table className="w-4 h-4 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-white">Matriz Mensual</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Ppto vs Real con avance parcial (%)
            </span>
          </button>

          <button
            onClick={() => setCurrentView('card_statements')}
            className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-emerald-400">
              <FileSpreadsheet className="w-4 h-4 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-white">Estados de Cuenta</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Fechas de corte, cuotas y conciliación
            </span>
          </button>

          <button
            onClick={() => setCurrentView('catalogs')}
            className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-amber-400">
              <Tag className="w-4 h-4 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-white">Catálogos & Gestión</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Crear/editar Categorías y Tarjetas
            </span>
          </button>

          <button
            onClick={() => setCurrentView('reports')}
            className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-2 text-indigo-400">
              <BarChart3 className="w-4 h-4 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-white">Gráficas & Reportes</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Gráficas mes a mes y acumuladas
            </span>
          </button>
        </div>
      </div>

      {/* 2. Executive Metric Cards Grid (Prompt #5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Liquidez Disponible Hoy */}
        <div
          id="card-liquidity-today"
          onClick={() => setCurrentView('cashflow')}
          className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-5 shadow-sm hover:border-slate-700 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Liquidez Disponible Hoy</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono-nums text-white tracking-tight">
              {formatMoney(todayCashBalanceCents, settings.currencySymbol)}
            </div>
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
              <span>{accounts.length} cuentas registradas</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
          {/* Sub-account mini pills */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[11px]">
            {accounts.slice(0, 3).map((acc) => (
              <span
                key={acc.id}
                className="px-2 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 font-mono-nums"
              >
                {acc.name.split(' ')[0]}: {formatMoney(accountBalances[acc.id] ?? acc.initialBalanceCents, settings.currencySymbol)}
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Saldo Mínimo Proyectado */}
        <div
          id="card-lowest-balance"
          onClick={() => setCurrentView('cashflow')}
          className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-5 shadow-sm hover:border-slate-700 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Punto Crítico del Mes</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                executiveSummary.lowestProjectedBalanceCents < 0
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-extrabold font-mono-nums tracking-tight ${
                executiveSummary.lowestProjectedBalanceCents < 0 ? 'text-rose-400' : 'text-white'
              }`}
            >
              {formatMoney(executiveSummary.lowestProjectedBalanceCents, settings.currencySymbol)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {executiveSummary.lowestBalanceDate ? (
                <span>Mínimo proyectado el <strong>{executiveSummary.lowestBalanceDate}</strong></span>
              ) : (
                <span>Sin compromisos críticos</span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Fin de mes proyectado:</span>
            <span className="font-bold font-mono-nums text-slate-200">
              {formatMoney(executiveSummary.projectedEndPeriodBalanceCents, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Card 3: Obligaciones del Mes */}
        <div
          id="card-obligations-summary"
          onClick={() => setCurrentView('movements')}
          className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-5 shadow-sm hover:border-slate-700 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Obligaciones Comprometidas</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono-nums text-white tracking-tight">
              {formatMoney(executiveSummary.committedObligationsNext30DaysCents, settings.currencySymbol)}
            </div>
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
              <span>{executiveSummary.monthObligationsCount} obligaciones en {selectedYearMonth}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Próximos 7 días:</span>
            <span className="font-bold font-mono-nums text-amber-400">
              {formatMoney(executiveSummary.next7DaysObligationsCents, settings.currencySymbol)}
            </span>
          </div>
        </div>

        {/* Card 4: Deuda Total Consolidada */}
        <div
          id="card-total-debt"
          onClick={() => setCurrentView('cards')}
          className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-5 shadow-sm hover:border-slate-700 transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Deuda Total Consolidada</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono-nums text-white tracking-tight">
              {formatMoney(executiveSummary.totalDebtCents, settings.currencySymbol)}
            </div>
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
              <span>Tarjetas + Préstamos activos</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Tarjetas: {formatMoney(executiveSummary.creditCardsUsedTotalCents, settings.currencySymbol)}</span>
            <span>Préstamos: {formatMoney(executiveSummary.loansPendingTotalCents, settings.currencySymbol)}</span>
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Projection Chart & Obligations Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Liquidity Projection Visualizer */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/90 border border-slate-800/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Proyección Diaria de Liquidez (30 Días)</h3>
              <p className="text-xs text-slate-400">Evolución del saldo disponible considerando movimientos comprometidos</p>
            </div>
            <button
              onClick={() => setCurrentView('cashflow')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
            >
              Ver tabla completa
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SVG Sparkline / Daily Area Graph */}
          <div className="w-full h-48 bg-slate-950/60 rounded-xl border border-slate-800/80 p-3 flex flex-col justify-between relative overflow-hidden">
            {next30DaysDaily.length > 1 ? (
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 100">
                <defs>
                  <linearGradient id="liquidityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Zero reference line if min < 0 */}
                {chartBounds.min < 0 && (
                  <line
                    x1="0"
                    y1={100 - ((0 - chartBounds.min) / (chartBounds.max - chartBounds.min)) * 100}
                    x2="300"
                    y2={100 - ((0 - chartBounds.min) / (chartBounds.max - chartBounds.min)) * 100}
                    stroke="#EF4444"
                    strokeDasharray="4"
                    strokeWidth="1"
                  />
                )}

                {/* Area fill */}
                <polygon
                  points={`
                    0,100
                    ${next30DaysDaily
                      .map((d, i) => {
                        const x = (i / (next30DaysDaily.length - 1)) * 300;
                        const y =
                          100 -
                          ((d.finalBalanceCents - chartBounds.min) / (chartBounds.max - chartBounds.min)) * 90 -
                          5;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    300,100
                  `}
                  fill="url(#liquidityGrad)"
                />

                {/* Line path */}
                <polyline
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={next30DaysDaily
                    .map((d, i) => {
                      const x = (i / (next30DaysDaily.length - 1)) * 300;
                      const y =
                        100 -
                        ((d.finalBalanceCents - chartBounds.min) / (chartBounds.max - chartBounds.min)) * 90 -
                        5;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />

                {/* Points on key days */}
                {next30DaysDaily.map((d, i) => {
                  if (i % 5 !== 0 && i !== next30DaysDaily.length - 1) return null;
                  const x = (i / (next30DaysDaily.length - 1)) * 300;
                  const y =
                    100 -
                    ((d.finalBalanceCents - chartBounds.min) / (chartBounds.max - chartBounds.min)) * 90 -
                    5;
                  return (
                    <circle
                      key={d.date}
                      cx={x}
                      cy={y}
                      r="3.5"
                      className={d.finalBalanceCents < 0 ? 'fill-rose-500' : 'fill-blue-400'}
                    />
                  );
                })}
              </svg>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Calculando proyección de liquidez...
              </div>
            )}

            {/* Scale Legends */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono-nums pt-1 border-t border-slate-900">
              <span>{next30DaysDaily[0]?.date || 'Hoy'}</span>
              <span>
                Máx: {formatMoney(chartBounds.max, settings.currencySymbol)} | Mín:{' '}
                {formatMoney(chartBounds.min, settings.currencySymbol)}
              </span>
              <span>{next30DaysDaily[next30DaysDaily.length - 1]?.date || 'Día +30'}</span>
            </div>
          </div>

          {/* Quick Metrics Bar for Selected Month */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3">
              <span className="text-[11px] text-slate-400">Ingresos Planificados</span>
              <div className="text-sm font-bold font-mono-nums text-emerald-400 mt-0.5">
                {formatMoney(executiveSummary.periodPlannedIncomeCents, settings.currencySymbol)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3">
              <span className="text-[11px] text-slate-400">Gastos Planificados</span>
              <div className="text-sm font-bold font-mono-nums text-rose-400 mt-0.5">
                {formatMoney(executiveSummary.periodPlannedExpenseCents, settings.currencySymbol)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3">
              <span className="text-[11px] text-slate-400">Ahorro Proyectado</span>
              <div
                className={`text-sm font-bold font-mono-nums mt-0.5 ${
                  executiveSummary.periodPlannedSavingsCents >= 0 ? 'text-blue-400' : 'text-rose-400'
                }`}
              >
                {formatMoney(executiveSummary.periodPlannedSavingsCents, settings.currencySymbol)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Today's State & Upcoming Obligations Action Center */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800/90 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">Movimientos de Hoy ({todayStr})</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400">
                {todayTransactions.length}
              </span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-60 overflow-y-auto no-scrollbar">
              {todayTransactions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400/80 mx-auto mb-1.5" />
                  No hay obligaciones ni pagos pendientes programados para hoy.
                </div>
              ) : (
                todayTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() =>
                          toggleTransactionStatus(
                            tx.id,
                            tx.status === 'completed' ? 'planned' : 'completed'
                          )
                        }
                        className={`w-4 h-4 rounded border flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                          tx.status === 'completed'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'border-slate-600 hover:border-slate-400'
                        }`}
                        title={tx.status === 'completed' ? 'Marcar como planificado' : 'Confirmar como realizado'}
                      >
                        {tx.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                      <div className="truncate">
                        <div
                          className={`font-semibold truncate text-white ${
                            tx.status === 'completed' ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {tx.concept}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {tx.status === 'completed' ? 'Efectuado' : 'Pendiente hoy'}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-bold font-mono-nums flex-shrink-0 ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatMoney(tx.amountCents, settings.currencySymbol)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Action Tools */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <button
              id="btn-dash-can-i-afford"
              onClick={() => setIsAffordModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition cursor-pointer border border-slate-700"
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Simular gasto: ¿Puedo pagarlo?</span>
            </button>
            <button
              id="btn-dash-new-movement"
              onClick={() => setIsNewMovementOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition cursor-pointer shadow-lg shadow-blue-600/20"
            >
              <DollarSign className="w-4 h-4" />
              <span>+ Nuevo movimiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CanIAffordModal isOpen={isAffordModalOpen} onClose={() => setIsAffordModalOpen(false)} />
      <QuickMovementModal isOpen={isNewMovementOpen} onClose={() => setIsNewMovementOpen(false)} />
    </div>
  );
};
