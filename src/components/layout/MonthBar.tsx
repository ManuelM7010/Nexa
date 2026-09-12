import React, { useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

const AVAILABLE_YEARS = [2025, 2026, 2027, 2028, 2029, 2030];

export const MonthBar: React.FC = () => {
  const { selectedYear, selectedMonth, setSelectedYearMonth } = useFinancial();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Go to previous month
  const handlePrev = () => {
    if (selectedMonth === 0) {
      setSelectedYearMonth(selectedYear - 1, 11);
    } else {
      setSelectedYearMonth(selectedYear, selectedMonth - 1);
    }
  };

  // Go to next month
  const handleNext = () => {
    if (selectedMonth === 11) {
      setSelectedYearMonth(selectedYear + 1, 0);
    } else {
      setSelectedYearMonth(selectedYear, selectedMonth + 1);
    }
  };

  // Jump to today
  const handleToday = () => {
    const now = new Date();
    setSelectedYearMonth(now.getFullYear(), now.getMonth());
  };

  // Scroll active month into view
  useEffect(() => {
    const activeEl = scrollContainerRef.current?.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedYear, selectedMonth]);

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800/80 px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
      {/* Year & Current Month Indicator + Arrow controls */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-1.5">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYearMonth(Number(e.target.value), selectedMonth)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {AVAILABLE_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <span className="text-sm font-bold text-slate-200">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition border border-slate-700 cursor-pointer"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Months Band (Prompt #42) */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1 overflow-x-auto no-scrollbar w-full sm:max-w-xl py-0.5"
      >
        {MONTH_SHORT.map((shortName, index) => {
          const isSelected = index === selectedMonth;
          return (
            <button
              key={shortName}
              data-active={isSelected}
              onClick={() => setSelectedYearMonth(selectedYear, index)}
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {shortName}
            </button>
          );
        })}
      </div>
    </div>
  );
};
