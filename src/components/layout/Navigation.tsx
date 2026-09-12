import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  ArrowLeftRight,
  PieChart,
  Calendar,
  CreditCard,
  Layers,
  Landmark,
  Tv,
  Zap,
  CheckSquare,
  BarChart3,
  Settings,
  X,
  Table,
  FileSpreadsheet,
  Tag,
  Menu,
} from 'lucide-react';
import { useFinancial, AppView } from '../../context/FinancialContext';

interface NavigationProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenMobile?: () => void;
}

interface NavItem {
  id: AppView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const Navigation: React.FC<NavigationProps> = ({ isMobileOpen, onCloseMobile, onOpenMobile }) => {
  const { currentView, setCurrentView, installmentPurchases, loans, subscriptions } = useFinancial();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cashflow', label: 'Flujo Diario', icon: TrendingUp },
    { id: 'matrix', label: 'Matriz Mensual', icon: Table },
    { id: 'budget', label: 'Presupuesto', icon: PieChart },
    { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'cards', label: 'Tarjetas de Crédito', icon: CreditCard },
    { id: 'card_statements', label: 'Estados de Cuenta', icon: FileSpreadsheet },
    {
      id: 'installments',
      label: 'Compras a Cuotas',
      icon: Layers,
      badge: installmentPurchases.length > 0 ? installmentPurchases.length : undefined,
    },
    {
      id: 'loans',
      label: 'Préstamos',
      icon: Landmark,
      badge: loans.length > 0 ? loans.length : undefined,
    },
    {
      id: 'subscriptions',
      label: 'Suscripciones',
      icon: Tv,
      badge: subscriptions.length > 0 ? subscriptions.length : undefined,
    },
    { id: 'services', label: 'Servicios Básicos', icon: Zap },
    { id: 'monthlyclose', label: 'Cierre Mensual', icon: CheckSquare },
    { id: 'reports', label: 'Reportes & Métricas', icon: BarChart3 },
    { id: 'catalogs', label: 'Catálogos & Gestión', icon: Tag },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const handleSelect = (view: AppView) => {
    setCurrentView(view);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-950/80 border-r border-slate-800/80 p-3 h-full overflow-y-auto no-scrollbar select-none shrink-0">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative flex flex-col w-72 max-w-[80vw] bg-slate-900 border-r border-slate-800 p-4 h-full overflow-y-auto z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <img src="/icon.svg" alt="NEXA" className="w-6 h-6 object-contain" />
                <span className="font-extrabold text-sm text-white">NEXA Finance</span>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around backdrop-blur-md">
        <button
          onClick={() => handleSelect('dashboard')}
          className={`flex flex-col items-center gap-1 p-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            currentView === 'dashboard' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Inicio</span>
        </button>
        <button
          onClick={() => handleSelect('matrix')}
          className={`flex flex-col items-center gap-1 p-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            currentView === 'matrix' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Matriz</span>
        </button>
        <button
          onClick={() => handleSelect('cashflow')}
          className={`flex flex-col items-center gap-1 p-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            currentView === 'cashflow' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Flujo</span>
        </button>
        <button
          onClick={() => handleSelect('card_statements')}
          className={`flex flex-col items-center gap-1 p-1 rounded-lg text-[10px] font-medium transition cursor-pointer ${
            currentView === 'card_statements' ? 'text-blue-400 font-bold' : 'text-slate-400'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Extractos</span>
        </button>
        <button
          onClick={onOpenMobile}
          className="flex flex-col items-center gap-1 p-1 rounded-lg text-[10px] font-medium transition cursor-pointer text-slate-400 hover:text-white"
        >
          <Menu className="w-4 h-4 text-blue-400" />
          <span>Más Tabs</span>
        </button>
      </nav>
    </>
  );
};
