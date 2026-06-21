import React, { useState } from 'react';
import { X, Plus, Trash2, UserPlus, DollarSign } from 'lucide-react';

export default function PassengerModal({ isOpen, onClose, passengers, onSave }) {
  const [localPassengers, setLocalPassengers] = useState([]);

  // Initialize state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalPassengers(passengers.map(p => ({ ...p })));
    }
  }, [isOpen, passengers]);

  if (!isOpen) return null;

  const handleNameChange = (id, name) => {
    setLocalPassengers(prev =>
      prev.map(p => (p.id === id ? { ...p, name } : p))
    );
  };

  const handleRateChange = (id, defaultRate) => {
    // Parse as float, or keep as string/zero while typing
    const val = parseFloat(defaultRate);
    setLocalPassengers(prev =>
      prev.map(p => (p.id === id ? { ...p, defaultRate: isNaN(val) ? 0 : val } : p))
    );
  };

  const handleAddPassenger = () => {
    const newId = Date.now().toString();
    setLocalPassengers(prev => [
      ...prev,
      { id: newId, name: 'Novo Passageiro', defaultRate: 8.00 }
    ]);
  };

  const handleRemovePassenger = (id) => {
    setLocalPassengers(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = () => {
    // Filter out passengers with empty names
    const filtered = localPassengers.filter(p => p.name.trim() !== '');
    onSave(filtered);
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
      <div className="relative w-full max-w-lg glass-panel rounded-3xl shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">Gerenciar Passageiros</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {localPassengers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              Nenhum passageiro adicionado. Clique no botão abaixo para adicionar.
            </div>
          ) : (
            localPassengers.map((passenger, index) => (
              <div 
                key={passenger.id} 
                className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition"
              >
                {/* Index badge */}
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
                  {index + 1}
                </span>

                {/* Name Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={passenger.name}
                    onChange={(e) => handleNameChange(passenger.id, e.target.value)}
                    placeholder="Nome do passageiro"
                    className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Default Rate Input */}
                <div className="w-28 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-xs">R$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={passenger.defaultRate}
                    onChange={(e) => handleRateChange(passenger.id, e.target.value)}
                    placeholder="Valor"
                    className="w-full bg-slate-900 border border-slate-700/50 rounded-xl pl-8 pr-2 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemovePassenger(passenger.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition duration-150"
                  title="Excluir Passageiro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}

          <button
            onClick={handleAddPassenger}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-dashed border-indigo-500/30 text-indigo-400 font-semibold text-sm transition"
          >
            <Plus className="w-4 h-4" />
            Adicionar Passageiro
          </button>
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
            Salvar Alterações
          </button>
        </div>

      </div>
    </div>
  );
}
