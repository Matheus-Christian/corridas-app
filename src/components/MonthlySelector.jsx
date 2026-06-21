import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function MonthlySelector({ selectedMonth, onChangeMonth }) {
  const currentYear = selectedMonth.getFullYear();
  const currentMonthIdx = selectedMonth.getMonth();

  const isMinMonth = currentYear === 2026 && currentMonthIdx === 5; // June is index 5

  const handlePrevMonth = () => {
    if (isMinMonth) return;
    const prev = new Date(currentYear, currentMonthIdx - 1, 1);
    onChangeMonth(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentYear, currentMonthIdx + 1, 1);
    onChangeMonth(next);
  };

  const handleMonthChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    const updated = new Date(currentYear, idx, 1);
    onChangeMonth(updated);
  };

  const handleYearChange = (e) => {
    const yr = parseInt(e.target.value, 10);
    // If selecting 2026, ensure month doesn't go below June (5)
    let targetMonth = currentMonthIdx;
    if (yr === 2026 && targetMonth < 5) {
      targetMonth = 5;
    }
    const updated = new Date(yr, targetMonth, 1);
    onChangeMonth(updated);
  };

  // Generate range of years starting from 2026
  const years = [];
  const startYear = 2026;
  const endYear = Math.max(new Date().getFullYear() + 3, 2026);
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  // Filter months to only show June onwards if year is 2026
  const availableMonths = MONTHS.map((name, idx) => ({ name, idx })).filter(
    (item) => currentYear > 2026 || item.idx >= 5
  );

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-400 leading-tight">Período Mensal</h2>
          <p className="text-lg font-semibold text-slate-100 mt-0.5">
            {MONTHS[currentMonthIdx]} de {currentYear}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={handlePrevMonth}
          disabled={isMinMonth}
          className={`p-2.5 rounded-xl border transition duration-200 ${
            isMinMonth 
              ? 'bg-slate-900 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-40' 
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300 cursor-pointer'
          }`}
          title={isMinMonth ? "Período limite atingido (Junho de 2026)" : "Mês Anterior"}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Month Selector dropdown */}
        <select
          value={currentMonthIdx}
          onChange={handleMonthChange}
          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {availableMonths.map((m) => (
            <option key={m.idx} value={m.idx} className="bg-slate-900 text-slate-100">
              {m.name}
            </option>
          ))}
        </select>

        {/* Year Selector dropdown */}
        <select
          value={currentYear}
          onChange={handleYearChange}
          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-slate-900 text-slate-100">
              {y}
            </option>
          ))}
        </select>

        <button
          onClick={handleNextMonth}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 transition duration-200 cursor-pointer"
          title="Próximo Mês"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
