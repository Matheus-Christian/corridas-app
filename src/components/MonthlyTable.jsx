import React from 'react';
import { CalendarRange, ExternalLink, ArrowRight, Copy, Check } from 'lucide-react';
import { getDriverStatus, getPassengerRate } from '../utils/storage';

export default function MonthlyTable({
  weeksData,     // Object: { [mondayISO]: weekStateData }
  mondayDates,   // Array of monday ISO strings for the selected month
  passengers,    // Current passenger list
  onJumpToWeek,  // Callback to jump to a week: (mondayISO) => void
  isPublicView = false,
  pixKey = '',
}) {
  const [copiedPassengerId, setCopiedPassengerId] = React.useState(null);

  const getWeekRangeLabel = (mondayISO) => {
    const start = new Date(mondayISO + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${fmt(start)} a ${fmt(end)}`;
  };

  // Safe getter for a passenger's total in a specific week
  const getPassengerWeekTotal = (passengerId, weekData) => {
    if (!weekData) return 0;
    
    // Default rate for this passenger in that week's config or default
    const pConfig = weekData.passengers?.find(p => p.id === passengerId);
    const defaultRate = pConfig 
      ? getPassengerRate(pConfig, weekData.carEfficiency || 12, weekData.gasPrice || 5.99)
      : 8.00;
    let total = 0;
    for (let day = 0; day < 7; day++) {
      const dStatus = getDriverStatus(day, weekData.driverStatus, weekData.driverOffDays);
      if (dStatus === 'off' || dStatus === 'neutral') continue;
      
      const cell = weekData.cellStates?.[passengerId]?.[day];
      // Resolve status and custom value
      let isPresent = false;
      let val = defaultRate;
      
      if (cell && typeof cell === 'object') {
        isPresent = cell.status === 'present';
        val = cell.value ?? defaultRate;
      } else if (cell === 'present') {
        isPresent = true;
      }
      
      if (isPresent) {
        total += val;
      }
    }
    return total;
  };

  // Grand monthly total for a passenger
  const getPassengerMonthTotal = (passengerId) => {
    return mondayDates.reduce((sum, mon) => {
      return sum + getPassengerWeekTotal(passengerId, weeksData[mon]);
    }, 0);
  };

  // Total for all passengers in a specific week
  const getWeekGrandTotal = (weekData) => {
    if (!weekData) return 0;
    return passengers.reduce((sum, p) => {
      return sum + getPassengerWeekTotal(p.id, weekData);
    }, 0);
  };

  // Grand monthly total for all passengers
  const getMonthGrandTotal = () => {
    return passengers.reduce((sum, p) => {
      return sum + getPassengerMonthTotal(p.id);
    }, 0);
  };

  const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleCopyPix = (passengerId) => {
    if (!pixKey) return;
    navigator.clipboard.writeText(pixKey);
    setCopiedPassengerId(passengerId);
    setTimeout(() => setCopiedPassengerId(null), 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 shadow-xl border border-white/10 w-full flex flex-col">
      
      {/* Table Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-emerald-400" />
            Consolidado Mensal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isPublicView 
              ? 'Resumo dos pagamentos acumulados semana a semana (modo leitura).'
              : 'Resumo dos pagamentos acumulados semana a semana. Clique em uma coluna ou célula para editar a semana.'
            }
          </p>
        </div>
      </div>

      {/* Main Table Wrapper (Horizontal scroll for mobile) */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="text-left py-3.5 px-4 font-semibold text-slate-400 text-sm border-b border-white/5 w-44">
                Passageiro
              </th>
              
              {/* Mondays headers */}
              {mondayDates.map((mon, idx) => {
                const label = getWeekRangeLabel(mon);
                const hasData = !!weeksData[mon];

                return (
                  <th 
                    key={mon} 
                    onClick={() => !isPublicView && onJumpToWeek(mon)}
                    className={`py-3 px-3 font-semibold text-center border-b border-white/5 transition-colors group w-32 ${
                      isPublicView ? 'cursor-default' : 'hover:bg-white/5 hover:text-indigo-400 cursor-pointer'
                    }`}
                    title={isPublicView ? `Semana de ${label}` : `Editar Semana de ${label}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] text-slate-500 font-medium">Semana {idx + 1}</span>
                      <span className={`text-xs font-bold leading-tight ${isPublicView ? '' : 'group-hover:text-indigo-300'}`}>{label}</span>
                      <span className={`text-[9px] font-semibold mt-1 px-1.5 py-0.5 rounded-full ${
                        hasData ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {hasData ? 'Preenchido' : 'Em branco'}
                      </span>
                    </div>
                  </th>
                );
              })}

              <th className="text-right py-3.5 px-4 font-semibold text-slate-200 text-sm border-b border-white/5 w-32">
                Total do Mês
              </th>

              {/* PIX Column Header */}
              <th className="text-center py-3.5 px-4 font-semibold text-slate-400 text-sm border-b border-white/5 w-24">
                PIX
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-white/5">
            {passengers.length === 0 ? (
              <tr>
                <td colSpan={mondayDates.length + 3} className="py-8 text-center text-slate-400 text-sm">
                  Nenhum passageiro cadastrado no momento.
                </td>
              </tr>
            ) : (
              passengers.map((passenger) => {
                const monthTotal = getPassengerMonthTotal(passenger.id);

                return (
                  <tr 
                    key={passenger.id} 
                    className="hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Passenger Info Cell */}
                    <td className="py-4 px-4 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {passenger.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm font-semibold text-slate-200">
                          {passenger.name}
                        </div>
                      </div>
                    </td>

                    {/* Week cells */}
                    {mondayDates.map((mon) => {
                      const weekVal = getPassengerWeekTotal(passenger.id, weeksData[mon]);
                      const hasData = !!weeksData[mon];
                      
                      let cellClass = '';
                      if (!hasData) {
                        cellClass = isPublicView ? 'text-slate-600' : 'text-slate-600 hover:text-indigo-400';
                      } else if (weekVal > 0) {
                        cellClass = isPublicView 
                          ? 'bg-emerald-500/5 text-emerald-400 font-bold'
                          : 'bg-emerald-500/5 text-emerald-400 font-bold hover:bg-emerald-500/10 hover:text-emerald-300';
                      } else {
                        cellClass = isPublicView ? 'text-slate-500' : 'text-slate-500 hover:text-indigo-400';
                      }

                      return (
                        <td 
                          key={mon} 
                          onClick={() => !isPublicView && onJumpToWeek(mon)}
                          className={`py-3 px-2 text-center border-b border-white/5 transition duration-150 ${
                            isPublicView ? 'cursor-default' : 'cursor-pointer'
                          } ${cellClass}`}
                          title={isPublicView ? undefined : "Clique para ir para esta semana"}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{weekVal > 0 ? formatCurrency(weekVal) : '-'}</span>
                            {!isPublicView && <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                          </div>
                        </td>
                      );
                    })}

                    {/* Passenger Month Total */}
                    <td className="py-4 px-4 text-right font-bold text-emerald-400 text-sm border-b border-white/5">
                      {formatCurrency(monthTotal)}
                    </td>

                    {/* PIX Cell */}
                    <td className="py-4 px-4 text-center border-b border-white/5">
                      {pixKey ? (
                        <button
                          onClick={() => handleCopyPix(passenger.id)}
                          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
                            copiedPassengerId === passenger.id
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-600 shadow-sm'
                          }`}
                          title="Copiar Chave PIX do Motorista"
                        >
                          {copiedPassengerId === passenger.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[10px]">PIX</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Bottom Row: Grand Totals per week */}
            {passengers.length > 0 && (
              <tr className="bg-slate-900/20 font-bold">
                <td className="py-4 px-4 text-slate-300 border-b border-white/5">
                  Total Geral Bruto
                </td>
                
                {mondayDates.map((mon) => {
                  const weekGrand = getWeekGrandTotal(weeksData[mon]);
                  return (
                    <td 
                      key={mon} 
                      onClick={() => !isPublicView && onJumpToWeek(mon)}
                      className={`py-4 px-2 text-center text-slate-200 border-b border-white/5 transition-colors ${
                        isPublicView ? 'cursor-default' : 'hover:text-indigo-400 hover:bg-white/5 cursor-pointer'
                      }`}
                    >
                      {weekGrand > 0 ? formatCurrency(weekGrand) : '-'}
                    </td>
                  );
                })}

                <td className="py-4 px-4 text-right text-emerald-300 border-b border-white/5">
                  {formatCurrency(getMonthGrandTotal())}
                </td>

                <td className="py-4 px-4 border-b border-white/5" />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Swipe Hint */}
      {!isPublicView && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-[11px]">
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
            Atalho: Clique em qualquer valor ou data para abrir e editar os detalhes daquela semana.
          </span>
        </div>
      )}

    </div>
  );
}
