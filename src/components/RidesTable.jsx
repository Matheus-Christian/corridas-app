import React from 'react';
import { ToggleLeft, ToggleRight, Ban, User, CalendarDays, Coins } from 'lucide-react';
import { getDriverStatus, getPassengerRate } from '../utils/storage';

const WEEK_DAYS = [
  { name: 'Seg', fullName: 'Segunda-feira' },
  { name: 'Ter', fullName: 'Terça-feira' },
  { name: 'Qua', fullName: 'Quarta-feira' },
  { name: 'Qui', fullName: 'Quinta-feira' },
  { name: 'Sex', fullName: 'Sexta-feira' },
  { name: 'Sáb', fullName: 'Sábado' },
  { name: 'Dom', fullName: 'Domingo' }
];

export default function RidesTable({
  startDate,
  passengers,
  driverStatus,
  driverOffDays,
  cellStates,
  onToggleCell,
  onCellValChange,
  onToggleDriverStatus,
  gasPrice = 5.99,
  carEfficiency = 12,
}) {
  const start = new Date(startDate + 'T00:00:00');

  const getDayDate = (dayIndex) => {
    const d = new Date(start);
    d.setDate(start.getDate() + dayIndex);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getCellObject = (cell, defaultRate) => {
    if (cell && typeof cell === 'object' && 'status' in cell) {
      return cell;
    }
    if (cell === 'present') {
      return { status: 'present', value: defaultRate };
    }
    return { status: 'off', value: 0 };
  };

  const getPassengerTotal = (passenger) => {
    let total = 0;
    const dynamicRate = getPassengerRate(passenger, carEfficiency, gasPrice);
    for (let day = 0; day < 7; day++) {
      const dStatus = getDriverStatus(day, driverStatus, driverOffDays);
      if (dStatus === 'off') continue;
      const cell = cellStates[passenger.id]?.[day];
      const cellObj = getCellObject(cell, dynamicRate);
      if (cellObj.status === 'present') {
        total += cellObj.value;
      }
    }
    return total;
  };

  const getPassengerPresences = (passenger) => {
    let count = 0;
    const dynamicRate = getPassengerRate(passenger, carEfficiency, gasPrice);
    for (let day = 0; day < 7; day++) {
      const dStatus = getDriverStatus(day, driverStatus, driverOffDays);
      if (dStatus === 'off') continue;
      const cell = cellStates[passenger.id]?.[day];
      const cellObj = getCellObject(cell, dynamicRate);
      if (cellObj.status === 'present') {
        count++;
      }
    }
    return count;
  };

  const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="glass-panel rounded-3xl p-6 shadow-xl border border-white/10 w-full flex flex-col">
      
      {/* Table Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            Matriz de Caronas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Clique nas células para alternar presença (🟢) e folga (🔵). Clique no valor verde para digitar uma tarifa customizada.
          </p>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="text-xs text-slate-400 flex items-center gap-1 sm:hidden bg-slate-900/60 px-3 py-1.5 rounded-full border border-white/5">
          <span>↔️ Deslize para ver todos os dias</span>
        </div>
      </div>

      {/* Main Table Wrapper (Horizontal scroll for mobile) */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full border-collapse min-w-[750px]">
          <thead>
            <tr>
              {/* Passenger Column Header */}
              <th className="text-left py-3.5 px-4 font-semibold text-slate-400 text-sm border-b border-white/5 w-44">
                Passageiro / Tarifa
              </th>

              {/* Day Columns Headers */}
              {WEEK_DAYS.map((day, idx) => {
                const dStatus = getDriverStatus(idx, driverStatus, driverOffDays);
                const dateStr = getDayDate(idx);

                let headerClass = 'text-slate-200';
                let btnClass = 'bg-slate-800 text-slate-400 hover:bg-slate-700';
                let dotClass = 'bg-slate-500';
                let statusLabel = 'Neutro M';
                let btnTitle = 'Motorista Neutro (Clique para mudar)';

                if (dStatus === 'active') {
                  headerClass = 'bg-emerald-500/[0.02] text-emerald-400 border-emerald-500/5';
                  btnClass = 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20';
                  dotClass = 'bg-emerald-400 glow-green';
                  statusLabel = 'Ativo M';
                  btnTitle = 'Motorista Ativo (Clique para mudar)';
                } else if (dStatus === 'off') {
                  headerClass = 'bg-red-500/[0.03] text-red-400 border-red-500/10';
                  btnClass = 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20';
                  dotClass = 'bg-red-400';
                  statusLabel = 'Folga M';
                  btnTitle = 'Motorista de Folga (Clique para mudar)';
                }

                return (
                  <th 
                    key={idx} 
                    className={`py-3 px-2 font-semibold text-center border-b border-white/5 transition-all duration-200 ${headerClass}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-400 font-medium">{day.name}</span>
                      <span className="text-sm font-bold">{dateStr}</span>
                      
                      {/* Driver status cycle button */}
                      <button
                        onClick={() => onToggleDriverStatus(idx)}
                        className={`mt-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 transition ${btnClass}`}
                        title={btnTitle}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                        <span>{statusLabel}</span>
                      </button>
                    </div>
                  </th>
                );
              })}

              {/* Passenger Total Column Header */}
              <th className="text-right py-3.5 px-4 font-semibold text-slate-400 text-sm border-b border-white/5 w-28">
                Total Acumulado
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-white/5">
            {passengers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 text-sm">
                  Nenhum passageiro configurado. Adicione no painel lateral.
                </td>
              </tr>
            ) : (
              passengers.map((passenger) => {
                const totalVal = getPassengerTotal(passenger);
                const presencesCount = getPassengerPresences(passenger);

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
                        <div>
                          <div className="text-sm font-semibold text-slate-200 leading-tight">
                            {passenger.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Padrão: {formatCurrency(getPassengerRate(passenger, carEfficiency, gasPrice))}
                          </div>
                        </div>
                      </div>
                    </td>

                    {WEEK_DAYS.map((_, dayIdx) => {
                      const dStatus = getDriverStatus(dayIdx, driverStatus, driverOffDays);
                      const isDriverOff = dStatus === 'off' || dStatus === 'neutral';
                      const rawCell = cellStates[passenger.id]?.[dayIdx];
                      const dynamicRate = getPassengerRate(passenger, carEfficiency, gasPrice);
                      const cellObj = getCellObject(rawCell, dynamicRate);
                      
                      // Resolve styling
                      let cellClass = '';
                      
                      if (isDriverOff) {
                        cellClass = 'bg-slate-900/60 border border-dashed border-red-500/10 text-slate-500 hover:cursor-not-allowed';
                      } else if (cellObj.status === 'present') {
                        cellClass = 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 glow-green';
                      } else if (cellObj.status === 'off') {
                        cellClass = 'bg-blue-500/5 border border-blue-500/10 text-blue-400/80 hover:bg-blue-500/10';
                      } else {
                        // Neutral State
                        cellClass = 'bg-slate-900/10 border border-white/5 text-slate-400/60 hover:bg-white/5 hover:text-slate-300';
                      }

                      return (
                        <td 
                          key={dayIdx} 
                          className="py-3.5 px-1 text-center border-b border-white/5"
                        >
                          {isDriverOff ? (
                            <div 
                              className={`w-full min-h-[46px] rounded-xl text-[10px] font-semibold py-2 px-1 select-none flex flex-col items-center justify-center gap-0.5 text-center leading-tight ${cellClass}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500/30" />
                              <span className="font-semibold text-slate-600">
                                Sem <br /> Corrida
                              </span>
                            </div>
                          ) : (
                            <div
                              onClick={() => onToggleCell(passenger.id, dayIdx)}
                              className={`w-full min-h-[46px] rounded-xl text-xs font-semibold py-2 px-0.5 select-none flex flex-col items-center justify-center gap-0.5 status-transition cursor-pointer ${cellClass}`}
                            >
                              {/* Color Dot indicator */}
                              <span className={`w-2 h-2 rounded-full ${
                                cellObj.status === 'present' 
                                  ? 'bg-emerald-500' 
                                  : cellObj.status === 'off'
                                    ? 'bg-blue-400'
                                    : 'bg-slate-600'
                              }`} />
                              
                              {/* Value rendering */}
                              {cellObj.status === 'present' ? (
                                <div 
                                  className="flex items-center justify-center gap-0.5"
                                  onClick={(e) => e.stopPropagation()} // Stop clicking inside input from toggling presence
                                >
                                  <span className="text-[10px] text-emerald-500/70 font-normal">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={cellObj.value === 0 ? '' : cellObj.value}
                                    onChange={(e) => onCellValChange(passenger.id, dayIdx, e.target.value)}
                                    className="w-12 bg-transparent text-center font-bold text-xs text-emerald-400 focus:outline-none focus:bg-emerald-500/10 rounded px-0.5 border-b border-dashed border-emerald-500/20 focus:border-emerald-400/50"
                                    title="Editar valor pago"
                                  />
                                </div>
                              ) : cellObj.status === 'off' ? (
                                <span className="font-semibold text-blue-400/80">Folga P</span>
                              ) : (
                                <span className="font-bold text-slate-500">-</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Passenger Total Cell */}
                    <td className="py-4 px-4 text-right font-bold text-slate-200 text-sm border-b border-white/5">
                      <div className="flex flex-col items-end">
                        <span className="text-slate-100 font-bold">{formatCurrency(totalVal)}</span>
                        <span className="text-[10px] text-indigo-400 font-medium">
                          {presencesCount} presenças
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend Block */}
      <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legenda de Status:</div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center sm:justify-start">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3.5 h-3.5 rounded-full bg-slate-600 inline-block" />
            <span>⚪ Neutro M/P (Sem Registro / Sem Custos)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block glow-green" />
            <span>🟢 Ativo M / Presença P (Gera Custos / Tarifa Editável)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500 inline-block" />
            <span>🔵 Folga Passageiro (R$ 0,00)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 inline-block" />
            <span>🚫 Folga Motorista (Sem Corrida / Bloqueado)</span>
          </div>
        </div>
      </div>

    </div>
  );
}
