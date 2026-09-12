import React, { useState } from 'react';
import { FinancialProvider, useFinancial } from './context/FinancialContext';
import { Header } from './components/layout/Header';
import { MonthBar } from './components/layout/MonthBar';
import { TabsBar } from './components/layout/TabsBar';
import { Navigation } from './components/layout/Navigation';
import { QuickMovementModal } from './components/common/QuickMovementModal';
import { CanIAffordModal } from './components/common/CanIAffordModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { NotificationToast } from './components/common/NotificationToast';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { DailyCashFlowView } from './components/cashflow/DailyCashFlowView';
import { MonthlyMatrixView } from './components/matrix/MonthlyMatrixView';
import { MovementsView } from './components/movements/MovementsView';
import { BudgetView } from './components/budget/BudgetView';
import { CalendarView } from './components/calendar/CalendarView';
import { CreditCardsView } from './components/cards/CreditCardsView';
import { CardStatementsView } from './components/cards/CardStatementsView';
import { InstallmentsView } from './components/installments/InstallmentsView';
import { LoansView } from './components/loans/LoansView';
import { SubscriptionsView } from './components/subscriptions/SubscriptionsView';
import { ServicesView } from './components/services/ServicesView';
import { MonthlyCloseView } from './components/monthlyclose/MonthlyCloseView';
import { ReportsView } from './components/reports/ReportsView';
import { CatalogsView } from './components/catalogs/CatalogsView';
import { SettingsView } from './components/settings/SettingsView';

const MainAppContent: React.FC = () => {
  const {
    currentView,
    isQuickMovementOpen,
    setIsQuickMovementOpen,
    isCanIAffordOpen,
    setIsCanIAffordOpen,
  } = useFinancial();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'cashflow':
        return <DailyCashFlowView />;
      case 'matrix':
        return <MonthlyMatrixView />;
      case 'movements':
        return <MovementsView />;
      case 'budget':
        return <BudgetView />;
      case 'calendar':
        return <CalendarView />;
      case 'cards':
        return <CreditCardsView />;
      case 'card_statements':
        return <CardStatementsView />;
      case 'installments':
        return <InstallmentsView />;
      case 'loans':
        return <LoansView />;
      case 'subscriptions':
        return <SubscriptionsView />;
      case 'services':
        return <ServicesView />;
      case 'monthlyclose':
        return <MonthlyCloseView />;
      case 'reports':
        return <ReportsView />;
      case 'catalogs':
        return <CatalogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white pb-20 md:pb-6">
      {/* Offline Status indicator */}
      <OfflineIndicator />

      {/* Global Notifications */}
      <NotificationToast />

      {/* Application Header */}
      <Header onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)} />

      {/* Month Navigator Bar */}
      <MonthBar />

      {/* Global Tabs Navigation Bar - Accessible on all viewports */}
      <TabsBar />

      {/* Main Layout: Sidebar on Desktop + Content Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex gap-6">
        {/* Navigation Sidebar */}
        <Navigation
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          onOpenMobile={() => setIsMobileNavOpen(true)}
        />

        {/* View Dynamic Canvas */}
        <main className="flex-1 min-w-0">
          {renderView()}
        </main>
      </div>

      {/* Global Modals */}
      <QuickMovementModal
        isOpen={isQuickMovementOpen}
        onClose={() => setIsQuickMovementOpen(false)}
      />

      <CanIAffordModal
        isOpen={isCanIAffordOpen}
        onClose={() => setIsCanIAffordOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <FinancialProvider>
      <MainAppContent />
    </FinancialProvider>
  );
}
