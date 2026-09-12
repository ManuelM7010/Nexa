import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Table,
  PieChart,
  ArrowLeftRight,
  Calendar,
  CreditCard,
  FileSpreadsheet,
  Layers,
  Landmark,
  Tv,
  Zap,
  CheckSquare,
  BarChart3,
  Tag,
  Settings,
} from 'lucide-react';
import { useFinancial, AppView } from '../../context/FinancialContext';

interface TabItem {
  id: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

export const TabsBar: React.FC = () => {
  const { currentView, setCurrentView } = useFinancial();

  const tabs: TabItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'matrix', label: 'Matriz Mensual (Ppto vs Real)', icon: Table, highlight: true },
    { id: 'cashflow', label: 'Flujo Diario', icon: TrendingUp },
    { id: 'budget', label: 'Presupuesto', icon: PieChart },
    { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
    { id: 'card_statements', label: 'Estados de Cuenta', icon: FileSpreadsheet, highlight: true },
    { id: 'cards', label: 'Tarjetas de Crédito', icon: CreditCard },
    { id: 'installments', label: 'Compras a Cuotas', icon: Layers },
    { id: 'subscriptions', label: 'Suscripciones', icon: Tv },
    { id: 'loans', label: 'Préstamos', icon: Landmark },
    { id: 'services', label: 'Servicios Básicos', icon: Zap },
    { id: 'monthlyclose', label: 'Cierre Mensual', icon: CheckSquare, highlight: true },
    { id: 'reports', label: 'Gráficas & Reportes', icon: BarChart3, highlight: true },
    { id: 'catalogs', label: 'Catálogos (Categorías/Tarjetas)', icon: Tag, highlight: true },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="w-full bg-slate-950/95 border-b border-slate-800/80 sticky top-[53px] z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar scroll-smooth">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-bar-btn-${tab.id}`}
                onClick={() => setCurrentView(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : tab.highlight
                    ? 'bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                    : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : tab.highlight ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
