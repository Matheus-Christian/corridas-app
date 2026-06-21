import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getMonday, formatDateISO } from '../utils/storage';

export default function DateSelector({ startDate, onChangeStartDate }) {
  const start = new Date(startDate + 'T00:00:00');
  
  // Calculate end date (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const formatDateLabel = (date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const isMinDate = startDate === '2026-06-01';

  const handlePrevWeek = () => {
    if (isMinDate) return;
    const prev = new Date(start);
    prev.setDate(start.getDate() - 7);
    onChangeStartDate(formatDateISO(getMonday(prev)));
  };

  const handleNextWeek = () => {
    const next = new Date(start);
    next.setDate(start.getDate() + 7);
    onChangeStartDate(formatDateISO(getMonday(next)));
  };

  const handleDateChange = (e) => {
    const chosen = new Date(e.target.value + 'T00:00:00');
    let mondayDate = getMonday(chosen);
    if (mondayDate < new Date('2026-06-01T00:00:00')) {
      mondayDate = new Date('2026-06-01T00:00:00');
    }
    onChangeStartDate(formatDateISO(mondayDate));
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-400 leading-tight">Período de Carona</h2>
          <p className="text-lg font-semibold text-slate-100 mt-0.5">
            {formatDateLabel(start)} a {formatDateLabel(end)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={handlePrevWeek}
          disabled={isMinDate}
          className={`p-2.5 rounded-xl border transition duration-200 ${
            isMinDate 
              ? 'bg-slate-900 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-40' 
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300 cursor-pointer'
          }`}
          title={isMinDate ? "Período limite atingido (Junho de 2026)" : "Semana Anterior"}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative flex items-center">
          <input
            type="date"
            value={startDate}
            min="2026-06-01"
            onChange={handleDateChange}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-200 font-medium text-sm transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
            title="Selecionar Data Personalizada"
          />
        </div>

        <button
          onClick={handleNextWeek}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 transition duration-200"
          title="Próxima Semana"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
