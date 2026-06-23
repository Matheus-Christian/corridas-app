import React, { useState, useEffect } from 'react';
import { X, Check, Users } from 'lucide-react';

export default function SelectWeekPassengersModal({ isOpen, onClose, globalPassengers, selectedPassengerIds, onSave }) {
  const [localSelectedIds, setLocalSelectedIds] = useState([]);

  // Initialize selected IDs when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds([...selectedPassengerIds]);
    }
  }, [isOpen, selectedPassengerIds]);

  if (!isOpen) return null;

  const handleTogglePassenger = (id) => {
    setLocalSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(localSelectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md glass-panel rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Passageiros da Semana</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Selecione abaixo os passageiros que participarão das caronas durante esta semana específica.
          </p>

          {globalPassengers.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhum passageiro cadastrado no sistema. Vá em "Gerenciar Passageiros" para cadastrar primeiro.
            </div>
          ) : (
            <div className="space-y-2">
              {globalPassengers.map((passenger) => {
                const isSelected = localSelectedIds.includes(passenger.id);
                return (
                  <div
                    key={passenger.id}
                    onClick={() => handleTogglePassenger(passenger.id)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                        : 'bg-white/5 border-white/5 hover:border-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected 
                          ? 'bg-indigo-500/20 text-indigo-400' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {passenger.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-semibold block">{passenger.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Tarifa Base: R$ {passenger.defaultRate.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-slate-700 bg-slate-900 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-slate-900/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-sm transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition"
          >
            Salvar
          </button>
        </div>

      </div>
    </div>
  );
}
