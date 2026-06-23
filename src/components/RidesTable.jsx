import React from 'react';
import { ToggleLeft, ToggleRight, Ban, User, CalendarDays, Coins, UserPlus, Trash2 } from 'lucide-react';
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
  onOpenSelectPassengersModal,
  onRemovePassenger,
  isPublicView = false,
  passengerMonthlyTotals = {},
  activeMonthName = '',
}) {
  const [swipedPassengerId, setSwipedPassengerId] = React.useState(null);

  React.useEffect(() => {
    if (!swipedPassengerId) return;

    const handleOutsideClick = () => {
      setSwipedPassengerId(null);
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [swipedPassengerId]);

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
    if (cell === 'paid') {
      return { status: 'paid', value: defaultRate };
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
      if (cellObj.status === 'present' || cellObj.status === 'paid') {
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
      if (cellObj.status === 'present' || cellObj.status === 'paid') {
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            Matriz de Caronas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isPublicView 
              ? 'Tabela de presenças da semana (modo leitura).'
              : 'Clique nas células para alternar presença (🟢) e folga (🔵). Clique no valor verde para digitar uma tarifa customizada.'
            }
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          {/* Add passenger to week button */}
          {!isPublicView && (
            <button
              onClick={onOpenSelectPassengersModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 transition duration-200 cursor-pointer"
              title="Selecionar os passageiros que participam desta semana"
            >
              <UserPlus className="w-4 h-4" />
              <span>Selecionar Passageiros</span>
            </button>
          )}

          {/* Mobile Swipe Hint */}
          {!isPublicView && (
            <div className="text-xs text-slate-400 flex items-center gap-1 sm:hidden bg-slate-900/60 px-3 py-2 rounded-xl border border-white/5">
              <span>↔️ Deslize</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Wrapper (Horizontal scroll for mobile) */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full border-collapse min-w-[800px]">
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

                if (dStatus === 'active') {
                  headerClass = 'bg-emerald-500/[0.02] text-emerald-400 border-emerald-500/5';
                  btnClass = 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20';
                  dotClass = 'bg-emerald-400 glow-green';
                  statusLabel = 'Ativo M';
                } else if (dStatus === 'off') {
                  headerClass = 'bg-red-500/[0.03] text-red-400 border-red-500/10';
                  btnClass = 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20';
                  dotClass = 'bg-red-400';
                  statusLabel = 'Folga M';
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
                      {isPublicView ? (
                        <div
                          className={`mt-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 opacity-85 select-none ${btnClass}`}
                          title={`Motorista: ${statusLabel}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                          <span>{statusLabel}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onToggleDriverStatus(idx)}
                          className={`mt-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 transition ${btnClass}`}
                          title={`Motorista ${statusLabel} (Clique para mudar)`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                          <span>{statusLabel}</span>
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}

              {/* Passenger Total Column Header */}
              <th className="text-right py-3.5 px-4 font-semibold text-slate-400 text-sm border-b border-white/5 w-28">
                Total Acumulado
              </th>

              {/* Monthly Total Column Header */}
              <th className="text-right py-3.5 px-4 font-semibold text-slate-400 text-sm border-b border-white/5 w-32">
                Total {activeMonthName}
              </th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-white/5">
            {passengers.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 py-4 max-w-sm mx-auto">
                    <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-3xl border border-indigo-500/25 shadow-lg shadow-indigo-500/5">
                      <UserPlus className="w-8 h-8" />
                    </div>
                    <div className="text-slate-200 text-base font-bold mt-1">Matriz de Caronas Vazia</div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Esta semana não tem passageiros ativos.
                    </p>
                    {!isPublicView && (
                      <button
                        onClick={onOpenSelectPassengersModal}
                        className="mt-2 flex items-center gap-2 py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        Selecionar Passageiros
                      </button>
                    )}
                  </div>
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
                      <div className="flex items-center overflow-hidden w-full">
                        {/* Excluir/Delete Button Container */}
                        {!isPublicView && (
                          <div
                            className={`transition-all duration-300 ease-out flex items-center justify-center ${
                              swipedPassengerId === passenger.id ? 'w-10 opacity-100 mr-2.5' : 'w-0 opacity-0'
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemovePassenger(passenger.id);
                              }}
                              className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-md transition duration-150 active:scale-95 flex items-center justify-center cursor-pointer"
                              title="Remover passageiro desta semana"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Passenger Details */}
                        <div
                          onClick={(e) => {
                            if (isPublicView) return;
                            e.stopPropagation();
                            setSwipedPassengerId(prev => prev === passenger.id ? null : passenger.id);
                          }}
                          className={`flex items-center gap-2 select-none transition-transform duration-300 ${
                            isPublicView ? 'cursor-default' : 'cursor-pointer'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition duration-200 ${
                            !isPublicView && swipedPassengerId === passenger.id 
                              ? 'bg-red-500/10 text-red-500' 
                              : 'bg-indigo-500/10 text-indigo-400'
                          }`}>
                            {passenger.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className={`text-sm font-semibold leading-tight transition duration-200 ${
                              !isPublicView && swipedPassengerId === passenger.id ? 'text-red-400' : 'text-slate-200'
                            }`}>
                              {passenger.name}
                            </div>
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
                        cellClass = 'cell-blocked bg-slate-900/60 border border-dashed border-red-500/10 text-slate-500 hover:cursor-not-allowed';
                      } else if (cellObj.status === 'present') {
                        cellClass = 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15 glow-yellow';
                      } else if (cellObj.status === 'paid') {
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
                              <span className="cell-blocked-dot w-1.5 h-1.5 rounded-full bg-red-500/30" />
                              <span className="font-semibold text-slate-600">
                                Sem <br /> Corrida
                              </span>
                            </div>
                          ) : (
                            <div
                              onClick={() => !isPublicView && onToggleCell(passenger.id, dayIdx)}
                              className={`w-full min-h-[46px] rounded-xl text-xs font-semibold py-2 px-0.5 select-none flex flex-col items-center justify-center gap-0.5 status-transition ${
                                isPublicView ? 'cursor-default' : 'cursor-pointer'
                              } ${cellClass}`}
                            >
                              {/* Color Dot indicator */}
                              <span className={`w-2 h-2 rounded-full ${
                                cellObj.status === 'present' 
                                  ? 'bg-amber-500' 
                                  : cellObj.status === 'paid'
                                    ? 'bg-emerald-500'
                                    : cellObj.status === 'off'
                                      ? 'bg-blue-400'
                                      : 'bg-slate-600'
                              }`} />
                              
                              {/* Value rendering */}
                              {(cellObj.status === 'present' || cellObj.status === 'paid') ? (
                                isPublicView ? (
                                  <span className={`font-bold text-[11px] ${
                                    cellObj.status === 'present' ? 'text-amber-400' : 'text-emerald-400'
                                  }`}>
                                    R$ {cellObj.value.toFixed(2).replace('.', ',')}
                                  </span>
                                ) : (
                                  <div 
                                    className="flex items-center justify-center gap-0.5"
                                    onClick={(e) => e.stopPropagation()} // Stop clicking inside input from toggling presence
                                  >
                                    <span className={`text-[10px] font-normal animate-pulse-light ${
                                      cellObj.status === 'present' ? 'text-amber-500/70' : 'text-emerald-500/70'
                                    }`}>R$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={cellObj.value === 0 ? '' : cellObj.value}
                                      onChange={(e) => onCellValChange(passenger.id, dayIdx, e.target.value)}
                                      className={`cell-rate-input w-12 bg-transparent text-center font-bold text-xs focus:outline-none rounded px-0.5 border-b border-dashed ${
                                        cellObj.status === 'present' 
                                          ? 'text-amber-400 focus:bg-amber-500/10 border-amber-500/20 focus:border-amber-400/50' 
                                          : 'text-emerald-400 focus:bg-emerald-500/10 border-emerald-500/20 focus:border-emerald-400/50'
                                      }`}
                                      title={cellObj.status === 'present' ? "Editar valor Presença P" : "Editar valor Dia Pago"}
                                    />
                                  </div>
                                )
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

                    {/* Passenger Monthly Total Cell */}
                    <td className="py-4 px-4 text-right font-bold text-emerald-400 text-sm border-b border-white/5">
                      {formatCurrency(passengerMonthlyTotals[passenger.id] || 0)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend Block */}
      <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-2.5">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Legenda de Status:</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
            <span>Neutro (Sem Registro)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block glow-yellow" />
            <span>Presença P</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block glow-green" />
            <span>Dia Pago</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Folga P (R$ 0,00)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            <span>Folga M (Sem Corrida)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block glow-green" />
            <span>Ativo M (Motorista)</span>
          </div>
        </div>
      </div>

    </div>
  );
}
