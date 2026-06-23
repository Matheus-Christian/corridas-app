import React from 'react';
import { Route, MapPin, Fuel, Coins, HelpCircle } from 'lucide-react';
import { getPassengerRate } from '../utils/storage';

export default function PassengerRoutesTable({
  passengers,
  gasPrice = 5.99,
  carEfficiency = 12,
  onUpdatePassengerRoute,
}) {
  const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const price = parseFloat(gasPrice) || 5.99;
  const eff = parseFloat(carEfficiency) || 12;

  const getPassengerTotalLiters = (p) => {
    const totalKm = (parseFloat(p.route?.ida?.km) || 0) + (parseFloat(p.route?.volta?.km) || 0);
    return eff > 0 ? totalKm / eff : 0;
  };

  return (
    <div className="glass-panel rounded-3xl p-6 shadow-xl border border-white/10 w-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Route className="w-5 h-5 text-indigo-400" />
            Custos de Rotas dos Passageiros
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure as rotas de Ida e Volta de cada passageiro. Os valores calculados serão aplicados como tarifa padrão na Matriz de Caronas.
          </p>
        </div>
      </div>

      {/* Table Wrapper */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full border-collapse min-w-[850px]">
          <thead>
            <tr className="border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="text-left py-3 px-4 w-44">Passageiro</th>
              <th className="text-left py-3 px-4">Ida (Ponto A ➔ B)</th>
              <th className="text-left py-3 px-4">Volta (Ponto B ➔ A)</th>
              <th className="text-right py-3 px-4 w-40">Resumo Diário</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-white/5">
            {passengers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                  Nenhum passageiro cadastrado. Adicione passageiros no painel lateral.
                </td>
              </tr>
            ) : (
              passengers.map((p) => {
                const calculatedRate = getPassengerRate(p, eff, price);
                const totalLiters = getPassengerTotalLiters(p);
                
                const idaKm = parseFloat(p.route?.ida?.km) || 0;
                const idaLiters = eff > 0 ? idaKm / eff : 0;
                const idaCost = idaLiters * price;

                const voltaKm = parseFloat(p.route?.volta?.km) || 0;
                const voltaLiters = eff > 0 ? voltaKm / eff : 0;
                const voltaCost = voltaLiters * price;

                return (
                  <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                    {/* Passenger Name & Avatar */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-200">{p.name}</span>
                      </div>
                    </td>

                    {/* Ida Section */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-2">
                        {/* De > Para Inputs */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="De"
                            value={p.route?.ida?.from || ''}
                            onChange={(e) => onUpdatePassengerRoute(p.id, 'ida', 'from', e.target.value)}
                            className="w-24 bg-slate-950/60 border border-slate-800/80 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                          />
                          <span className="text-slate-600 text-xs font-semibold">➔</span>
                          <input
                            type="text"
                            placeholder="Para"
                            value={p.route?.ida?.to || ''}
                            onChange={(e) => onUpdatePassengerRoute(p.id, 'ida', 'to', e.target.value)}
                            className="w-24 bg-slate-950/60 border border-slate-800/80 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                          />
                        </div>
                        {/* Km and Calculation display */}
                        <div className="flex items-center gap-3">
                          <div className="relative w-16.5">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="Km"
                              value={p.route?.ida?.km === 0 ? '' : p.route?.ida?.km ?? ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                onUpdatePassengerRoute(p.id, 'ida', 'km', isNaN(val) ? 0 : val);
                              }}
                              className="w-full text-center bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-lg py-1 pr-4 text-xs font-semibold text-slate-100 focus:outline-none"
                            />
                            <span className="absolute right-1 top-1.5 text-[9px] text-slate-500 font-bold">km</span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Fuel className="w-3 h-3 text-slate-500" />
                            {idaLiters.toFixed(2)} L
                          </span>
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            {formatCurrency(idaCost)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Volta Section */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-2">
                        {/* De > Para Inputs */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="De"
                            value={p.route?.volta?.from || ''}
                            onChange={(e) => onUpdatePassengerRoute(p.id, 'volta', 'from', e.target.value)}
                            className="w-24 bg-slate-950/60 border border-slate-800/80 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                          />
                          <span className="text-slate-600 text-xs font-semibold">➔</span>
                          <input
                            type="text"
                            placeholder="Para"
                            value={p.route?.volta?.to || ''}
                            onChange={(e) => onUpdatePassengerRoute(p.id, 'volta', 'to', e.target.value)}
                            className="w-24 bg-slate-950/60 border border-slate-800/80 focus:border-indigo-500 rounded-lg px-2 py-1 text-xs text-slate-100 placeholder:text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                          />
                        </div>
                        {/* Km and Calculation display */}
                        <div className="flex items-center gap-3">
                          <div className="relative w-16.5">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="Km"
                              value={p.route?.volta?.km === 0 ? '' : p.route?.volta?.km ?? ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                onUpdatePassengerRoute(p.id, 'volta', 'km', isNaN(val) ? 0 : val);
                              }}
                              className="w-full text-center bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-lg py-1 pr-4 text-xs font-semibold text-slate-100 focus:outline-none"
                            />
                            <span className="absolute right-1 top-1.5 text-[9px] text-slate-500 font-bold">km</span>
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Fuel className="w-3 h-3 text-slate-500" />
                            {voltaLiters.toFixed(2)} L
                          </span>
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            {formatCurrency(voltaCost)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Resumo Diário */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-emerald-400 font-bold text-sm tracking-tight">
                          {formatCurrency(calculatedRate)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {totalLiters.toFixed(2)} Litros/dia
                        </span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-semibold px-1.5 py-0.5 rounded-full mt-1.5 border border-emerald-500/10">
                          Tarifa Gerada
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

      {/* Info Tips */}
      <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400 leading-normal">
        <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>
          A <strong>Tarifa Gerada</strong> para cada passageiro é calculada automaticamente multiplicando o consumo de gasolina do trecho (Km / Rendimento do Carro) pelo Preço da Gasolina da semana correspondente.
        </span>
      </div>

    </div>
  );
}
