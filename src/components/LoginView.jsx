import React, { useState } from 'react';
import { User, Lock, LogIn, AlertCircle, Eye, EyeOff, CarFront } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const correctUser = (import.meta.env.VITE_ADMIN_USERNAME || 'admin').trim();
    const correctPass = (import.meta.env.VITE_ADMIN_PASSWORD || 'admin').trim();

    if (username.trim() === correctUser && password.trim() === correctPass) {
      setError('');
      onLoginSuccess();
    } else {
      setError('Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Decorative Blur Spheres (Background) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl bg-slate-900/40">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25 animate-float-slow">
            <CarFront className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-50 to-slate-200">
              Área Administrativa
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Faça login para gerenciar as caronas e parâmetros
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">
              Usuário
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="text-slate-500 w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Seu usuário"
                className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">
              Senha
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="text-slate-500 w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="block w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 transition duration-200 cursor-pointer mt-2"
          >
            <LogIn className="w-4.5 h-4.5" />
            Acessar Painel
          </button>
        </form>
      </div>
    </div>
  );
}
