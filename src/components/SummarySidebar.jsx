import React from 'react';
import { DollarSign, Fuel, ShieldAlert, Sparkles, Save, RotateCcw, Users, Calculator } from 'lucide-react';

export default function SummarySidebar({
  gasPrice,
  onGasPriceChange,
  dailyBasicValue,
  onDailyBasicValueChange,
  dailyConsumption,
  onDailyConsumptionChange,
  carEfficiency,
  onCarEfficiencyChange,
  activeDaysCount,
  totalGross,
  totalNet,
  onSave,
  onReset,
  onOpenPassengersModal,
  saveSuccess,
  disabled = false,
  syncStatus = 'local-only'
}) {

  const [localGasPrice, setLocalGasPrice] = React.useState(() => gasPrice === 0 ? '' : String(gasPrice));
  const [localDailyConsumption, setLocalDailyConsumption] = React.useState(() => dailyConsumption === 0 ? '' : String(dailyConsumption));
  const [localCarEfficiency, setLocalCarEfficiency] = React.useState(() => carEfficiency === 0 ? '' : String(carEfficiency));

  React.useEffect(() => {
    const currentNum = parseFloat(localGasPrice) || 0;
    if (currentNum !== gasPrice) {
      setLocalGasPrice(gasPrice === 0 ? '' : String(gasPrice));
    }
  }, [gasPrice]);

  React.useEffect(() => {
    const currentNum = parseFloat(localDailyConsumption) || 0;
    if (currentNum !== dailyConsumption) {
      setLocalDailyConsumption(dailyConsumption === 0 ? '' : String(dailyConsumption));
    }
  }, [dailyConsumption]);

  React.useEffect(() => {
    const currentNum = parseFloat(localCarEfficiency) || 0;
    if (currentNum !== carEfficiency) {
      setLocalCarEfficiency(carEfficiency === 0 ? '' : String(carEfficiency));
    }
  }, [carEfficiency]);

  const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const totalExpenses = gasPrice * dailyConsumption * activeDaysCount;

  return (
    <div className="flex flex-col gap-6 w-full lg:w-80 shrink-0">
      
      {/* 1. MAIN NET EARNINGS CARD */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 shadow-xl border border-emerald-500/20 bg-gradient-to-br from-slate-900/60 to-emerald-950/20 glow-green">
        {/* Glow orb */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            {disabled ? 'Líquido Estimado (Mês)' : 'Total Líquido (TotalM)'}
          </span>
          <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
            <Calculator className="w-5 h-5" />
          </div>
        </div>

        <h3 className="text-3xl font-extrabold text-white tracking-tight mt-1">
          {formatCurrency(totalNet)}
        </h3>
        
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 leading-relaxed">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          {disabled ? (
            <span>Consolidado para <strong>{activeDaysCount} dias de carona</strong> no mês.</span>
          ) : (
            <span>Calculado para <strong>{activeDaysCount} dias ativos</strong> de carona.</span>
          )}
        </p>
      </div>

      {/* 2. STATS OVERVIEW (GROSS & EXPENSES) */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
        {/* Gross */}
        <div className="rounded-2xl glass-panel p-4.5 border border-white/5 bg-slate-900/40">
          <span className="text-xs text-slate-400 font-medium">Total Geral Bruto</span>
          <h4 className="text-xl font-bold text-slate-200 mt-1">
            {formatCurrency(totalGross)}
          </h4>
        </div>

        {/* Expenses */}
        <div className="rounded-2xl glass-panel p-4.5 border border-white/5 bg-slate-900/40">
          <span className="text-xs text-slate-400 font-medium">Custos Totais</span>
          <h4 className="text-xl font-bold text-red-400 mt-1">
            {formatCurrency(totalExpenses)}
          </h4>
        </div>
      </div>

      {/* 3. SETTINGS & INPUTS */}
      <div className="rounded-3xl glass-panel p-6 border border-white/10 flex flex-col gap-5">
        <h3 className="text-md font-bold text-slate-200 flex items-center gap-2 border-b border-white/5 pb-3">
          <Fuel className="w-4 h-4 text-indigo-400" />
          {disabled ? 'Parâmetros (Médios)' : 'Parâmetros Semanais'}
        </h3>

        {disabled && (
          <div className="text-[11px] text-indigo-300 leading-relaxed bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20">
            💡 Os parâmetros abaixo são apenas para referência do mês. Edite-os nas visualizações de cada semana correspondente.
          </div>
        )}

        {/* Gas Price (G/L) */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2">
            Preço da Gasolina (G/L)
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-slate-500 text-sm">R$</span>
            </div>
            <input
              type="number"
              step="0.01"
              disabled={disabled}
              value={localGasPrice}
              onChange={(e) => {
                const valStr = e.target.value;
                setLocalGasPrice(valStr);
                const valNum = parseFloat(valStr) || 0;
                onGasPriceChange(valNum);
              }}
              className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Consumption per day (L) */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2">
            Consumo Diário (L)
          </label>
          <div className="relative rounded-xl shadow-sm">
            <input
              type="number"
              step="0.1"
              disabled={disabled}
              value={localDailyConsumption}
              onChange={(e) => {
                const valStr = e.target.value;
                setLocalDailyConsumption(valStr);
                const valNum = parseFloat(valStr) || 0;
                onDailyConsumptionChange(valNum);
              }}
              className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-slate-500 text-xs">L/dia</span>
            </div>
          </div>
        </div>

        {/* Car Efficiency (km/L) */}
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-2">
            Rendimento do Carro (km/L)
          </label>
          <div className="relative rounded-xl shadow-sm">
            <input
              type="number"
              step="0.1"
              disabled={disabled}
              value={localCarEfficiency}
              onChange={(e) => {
                const valStr = e.target.value;
                setLocalCarEfficiency(valStr);
                const valNum = parseFloat(valStr) || 0;
                onCarEfficiencyChange(valNum);
              }}
              className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-slate-500 text-xs">km/L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status Warning Banners */}
      {syncStatus === 'local-only' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 flex flex-col gap-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Apenas Armazenamento Local</span>
          </div>
          <p>
            O Firebase não está configurado. Alterações feitas neste navegador <strong>não serão sincronizadas</strong> com outros dispositivos/navegadores.
          </p>
          <span className="text-[10px] text-amber-400/80">Configure o arquivo <code>.env</code> com credenciais válidas.</span>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-xs text-red-200 flex flex-col gap-1.5 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-red-400 animate-pulse">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Erro na Sincronização</span>
          </div>
          <p>
            Não foi possível carregar ou salvar dados na nuvem. Suas <strong>Regras do Firestore</strong> no Firebase Console podem ter expirado ou as credenciais estão incorretas.
          </p>
          <span className="text-[10px] text-red-400/80 font-medium">Verifique o console do navegador para detalhes do erro.</span>
        </div>
      )}

      {/* 4. QUICK ACTIONS */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onOpenPassengersModal}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 transition duration-200"
        >
          <Users className="w-4 h-4" />
          Gerenciar Passageiros
        </button>

        {!disabled && (
          <>
            <button
              onClick={onSave}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-sm border transition duration-200 ${
                saveSuccess
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-200'
              }`}
            >
              <Save className={`w-4 h-4 ${saveSuccess ? 'animate-bounce' : ''}`} />
              {saveSuccess ? 'Semana Salva!' : 'Salvar Semana'}
            </button>

            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 font-semibold text-sm transition duration-200"
            >
              <RotateCcw className="w-4 h-4" />
              Resetar / Nova Semana
            </button>
          </>
        )}
      </div>

    </div>
  );
}
