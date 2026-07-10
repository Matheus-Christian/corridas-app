import React from 'react';
import { CalendarRange, ExternalLink, ArrowRight, Copy, Check, X } from 'lucide-react';
import { getDriverStatus, getPassengerRate } from '../utils/storage';
import { generatePixPayload } from '../utils/pix';

export default function MonthlyTable({
  weeksData,     // Object: { [mondayISO]: weekStateData }
  mondayDates,   // Array of monday ISO strings for the selected month
  passengers,    // Current passenger list
  onJumpToWeek,  // Callback to jump to a week: (mondayISO) => void
  isPublicView = false,
  pixKey = '',
}) {
  const [copiedPassengerId, setCopiedPassengerId] = React.useState(null);
  const [selectedPixPassenger, setSelectedPixPassenger] = React.useState(null);
  const [pixAmountType, setPixAmountType] = React.useState('month'); // 'month' | 'week' | 'custom' | 'none'
  const [selectedWeekIdx, setSelectedWeekIdx] = React.useState(0);
  const [customPixAmount, setCustomPixAmount] = React.useState('');
  const [generatedPix, setGeneratedPix] = React.useState(null); // { code, amount, label }
  const [copiedPixCode, setCopiedPixCode] = React.useState(false);

  const getPassengerWeeksList = (passengerId) => {
    return mondayDates.map((mon, idx) => {
      const value = getPassengerWeekTotal(passengerId, weeksData[mon]);
      return {
        mondayISO: mon,
        weekLabel: `Semana ${idx + 1} (${getWeekRangeLabel(mon)})`,
        value: value
      };
    }).filter(w => w.value > 0);
  };

  const handleGeneratePix = () => {
    if (!selectedPixPassenger) return;
    
    let amount = null;
    let label = '';
    
    if (pixAmountType === 'month') {
      amount = selectedPixPassenger.monthTotal;
      label = `Total do Mês - ${formatCurrency(amount)}`;
    } else if (pixAmountType === 'week') {
      const weekItem = selectedPixPassenger.weeksList[selectedWeekIdx];
      if (weekItem) {
        amount = weekItem.value;
        label = `${weekItem.weekLabel} - ${formatCurrency(amount)}`;
      } else {
        alert("Nenhuma semana válida selecionada.");
        return;
      }
    } else if (pixAmountType === 'custom') {
      const parsed = parseFloat(customPixAmount);
      if (isNaN(parsed) || parsed <= 0) {
        alert("Por favor, insira um valor válido maior que R$ 0,00.");
        return;
      }
      amount = parsed;
      label = `Valor Personalizado - ${formatCurrency(amount)}`;
    } else {
      amount = null;
      label = 'Chave PIX Direta (Sem valor definido)';
    }
    
    try {
      const code = generatePixPayload(pixKey, amount, 'Caronas App', 'SAO PAULO');
      setGeneratedPix({ code, amount, label });
      setCopiedPixCode(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao gerar payload do PIX.");
    }
  };

  const handleCopyPixCode = () => {
    if (!generatedPix) return;
    navigator.clipboard.writeText(generatedPix.code);
    setCopiedPixCode(true);
    setTimeout(() => setCopiedPixCode(false), 2000);
  };

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
        isPresent = cell.status === 'present' || cell.status === 'paid';
        val = cell.value ?? defaultRate;
      } else if (cell === 'present' || cell === 'paid') {
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
                          onClick={() => {
                            const monthTotal = getPassengerMonthTotal(passenger.id);
                            const weeksList = getPassengerWeeksList(passenger.id);
                            setSelectedPixPassenger({
                              id: passenger.id,
                              name: passenger.name,
                              monthTotal,
                              weeksList
                            });
                            setPixAmountType('month');
                            setSelectedWeekIdx(0);
                            setCustomPixAmount('');
                            setGeneratedPix(null);
                          }}
                          className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer select-none bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-600 shadow-sm"
                          title="Opções de Pagamento PIX"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[10px]">PIX</span>
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

      {/* PIX Modal Dialog */}
      {selectedPixPassenger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setSelectedPixPassenger(null);
              setGeneratedPix(null);
            }}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md glass-panel rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 bg-slate-900/95">
            
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold text-slate-100">PIX Dinâmico</h2>
              </div>
              <button 
                onClick={() => {
                  setSelectedPixPassenger(null);
                  setGeneratedPix(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {!generatedPix ? (
                // View 1: Select payment options
                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-slate-400">Passageiro selecionado:</p>
                    <h3 className="text-lg font-bold text-indigo-400">{selectedPixPassenger.name}</h3>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-300">Escolha uma opção de cobrança:</p>

                    {/* Option 1: Monthly Total */}
                    <label className={`flex items-start gap-3 p-4 rounded-2xl border transition cursor-pointer select-none ${
                      pixAmountType === 'month'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                        : 'bg-white/5 border-white/5 hover:border-white/10 text-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="pixType"
                        checked={pixAmountType === 'month'}
                        onChange={() => setPixAmountType('month')}
                        className="mt-1 accent-indigo-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold block">Total Acumulado do Mês</span>
                        <span className="text-xs text-emerald-400 font-bold block mt-0.5">
                          {formatCurrency(selectedPixPassenger.monthTotal)}
                        </span>
                      </div>
                    </label>

                    {/* Option 2: Weekly Total (only if active weeks exist) */}
                    {selectedPixPassenger.weeksList.length > 0 ? (
                      <div className={`flex flex-col gap-2 p-4 rounded-2xl border transition ${
                        pixAmountType === 'week'
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                          : 'bg-white/5 border-white/5 hover:border-white/10 text-slate-300'
                      }`}>
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="pixType"
                            checked={pixAmountType === 'week'}
                            onChange={() => setPixAmountType('week')}
                            className="mt-1 accent-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-semibold block">Pagar uma Semana Específica</span>
                          </div>
                        </label>
                        {pixAmountType === 'week' && (
                          <div className="mt-2 pl-6">
                            <select
                              value={selectedWeekIdx}
                              onChange={(e) => setSelectedWeekIdx(parseInt(e.target.value, 10))}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                              {selectedPixPassenger.weeksList.map((w, idx) => (
                                <option key={w.mondayISO} value={idx}>
                                  {w.weekLabel} - {formatCurrency(w.value)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-800/40 text-slate-500 border border-slate-800 text-xs">
                        Nenhuma semana preenchida neste mês.
                      </div>
                    )}

                    {/* Option 3: Custom Amount */}
                    <div className={`flex flex-col gap-2 p-4 rounded-2xl border transition ${
                      pixAmountType === 'custom'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                        : 'bg-white/5 border-white/5 hover:border-white/10 text-slate-300'
                    }`}>
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="pixType"
                          checked={pixAmountType === 'custom'}
                          onChange={() => setPixAmountType('custom')}
                          className="mt-1 accent-indigo-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-semibold block">Valor Personalizado</span>
                        </div>
                      </label>
                      {pixAmountType === 'custom' && (
                        <div className="mt-2 pl-6 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs font-semibold">
                            R$
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={customPixAmount}
                            onChange={(e) => setCustomPixAmount(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Option 4: Direct Key (No value) */}
                    <label className={`flex items-start gap-3 p-4 rounded-2xl border transition cursor-pointer select-none ${
                      pixAmountType === 'none'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                        : 'bg-white/5 border-white/5 hover:border-white/10 text-slate-300'
                    }`}>
                      <input
                        type="radio"
                        name="pixType"
                        checked={pixAmountType === 'none'}
                        onChange={() => setPixAmountType('none')}
                        className="mt-1 accent-indigo-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-semibold block">Apenas QR Code / Chave PIX</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Gera o PIX para escaneamento sem definir valor fixo.
                        </span>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleGeneratePix}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition cursor-pointer mt-4"
                  >
                    Gerar Código PIX
                  </button>
                </div>
              ) : (
                // View 2: Show QR Code and copy-paste code
                <div className="space-y-6 text-center">
                  <div>
                    <p className="text-xs text-slate-400">PIX para {selectedPixPassenger.name}</p>
                    <h4 className="text-sm font-bold text-indigo-300 mt-1">{generatedPix.label}</h4>
                  </div>

                  {/* QR Code Frame */}
                  <div className="bg-white p-4 rounded-3xl inline-block shadow-lg border border-white/10 mx-auto">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generatedPix.code)}`} 
                      alt="QR Code PIX" 
                      className="w-40 h-40 object-contain"
                    />
                  </div>

                  {/* Copia e Cola Field */}
                  <div className="text-left space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Código Copia e Cola</label>
                    <div className="relative bg-slate-950 p-3 rounded-2xl border border-white/5 font-mono text-[10px] text-slate-300 break-all select-all max-h-24 overflow-y-auto">
                      {generatedPix.code}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setGeneratedPix(null)}
                      className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-sm transition cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCopyPixCode}
                      className={`py-2.5 px-4 rounded-xl font-semibold text-sm transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        copiedPixCode
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {copiedPixCode ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Código</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-slate-900/60 flex items-center justify-end">
              <button
                onClick={() => {
                  setSelectedPixPassenger(null);
                  setGeneratedPix(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-sm transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
