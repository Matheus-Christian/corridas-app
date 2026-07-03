import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Download, Upload, Clock, Trash2, RefreshCw, 
  CheckCircle, AlertTriangle, Key, Cloud, CloudOff, FileJson, 
  ExternalLink, Loader2 
} from 'lucide-react';

export default function BackupView({
  googleClientId,
  onSaveGoogleClientId,
  googleToken,
  googleUser,
  onConnectGoogle,
  onDisconnectGoogle,
  backupFrequency,
  onChangeBackupFrequency,
  lastAutoBackupTime,
  onExportLocal,
  onImportLocal,
  onSaveToDrive,
  driveFiles,
  onLoadDriveFiles,
  onRestoreFromDrive,
  onDeleteFromDrive,
  isDriveLoading
}) {
  const [localClientId, setLocalClientId] = useState(googleClientId || '');
  const [editingClientId, setEditingClientId] = useState(!googleClientId);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setLocalClientId(googleClientId || '');
    if (googleClientId) {
      setEditingClientId(false);
    } else {
      setEditingClientId(true);
    }
  }, [googleClientId]);

  const handleSaveClientId = (e) => {
    e.preventDefault();
    if (!localClientId.trim()) {
      alert("Por favor, insira um Client ID válido.");
      return;
    }
    onSaveGoogleClientId(localClientId.trim());
    setEditingClientId(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (window.confirm("ATENÇÃO: Importar este backup substituirá permanentemente todos os dados atuais do sistema. Deseja continuar?")) {
          onImportLocal(parsed);
        }
      } catch (err) {
        alert("Erro ao ler o arquivo JSON. Certifique-se de que é um backup válido do CaronasApp.");
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    const kb = bytes / 1024;
    return `${kb.toFixed(2)} KB`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getFrequencyLabel = (freq) => {
    switch (freq) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      default: return 'Desativado';
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* 1. Header Information */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-6 shadow-xl border border-indigo-500/20 bg-gradient-to-br from-slate-900/60 to-indigo-950/20">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-400" />
              Backup e Restauração de Dados
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              Mantenha os dados do aplicativo protegidos. Faça backup manual ou configure a sincronização automática direto no seu **Google Drive**.
            </p>
          </div>
          {googleToken ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-4 py-2.5 rounded-2xl text-xs text-emerald-400 font-semibold self-start md:self-center">
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Conectado ao Google Drive</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-2xl text-xs text-slate-400 font-semibold self-start md:self-center">
              <CloudOff className="w-4 h-4 text-slate-500" />
              <span>Google Drive Desconectado</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Setup Google & Frequency */}
        <div className="lg:col-span-1 flex flex-col gap-6 w-full">
          
          {/* Google Credentials Setup */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <Key className="w-4 h-4 text-indigo-400" />
              Google API Client ID
            </h3>

            {editingClientId ? (
              <form onSubmit={handleSaveClientId} className="flex flex-col gap-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para integrar com o Google Drive, insira o <strong>Client ID OAuth 2.0</strong> gerado no seu Google Cloud Console.
                </p>
                <input
                  type="text"
                  placeholder="Seu Google Client ID"
                  value={localClientId}
                  onChange={(e) => setLocalClientId(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition cursor-pointer"
                  >
                    Salvar ID
                  </button>
                  {googleClientId && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalClientId(googleClientId);
                        setEditingClientId(false);
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-950/80 px-3 py-2 rounded-xl border border-white/5 overflow-hidden">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Client ID Ativo</p>
                  <p className="text-xs font-mono text-slate-300 truncate mt-0.5" title={googleClientId}>
                    {googleClientId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingClientId(true)}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
                  >
                    Alterar Client ID
                  </button>
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-slate-200 transition flex items-center justify-center"
                    title="Acessar Google Cloud Console"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Login / Connect Google Drive */}
            {googleClientId && (
              <div className="border-t border-white/5 pt-4 mt-1 flex flex-col gap-3">
                {googleToken ? (
                  <>
                    <div className="text-xs text-slate-300 leading-relaxed bg-emerald-950/10 border border-emerald-900/30 p-3 rounded-2xl flex flex-col gap-1">
                      <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        Google Drive Conectado
                      </p>
                      {googleUser && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Usuário: <span className="font-semibold text-slate-300">{googleUser}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={onDisconnectGoogle}
                      className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs rounded-xl transition cursor-pointer"
                    >
                      Desconectar Conta Google
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Conecte sua conta do Google para autorizar o CaronasApp a gerenciar arquivos de backup diretamente no seu Google Drive.
                    </p>
                    <button
                      onClick={onConnectGoogle}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-lg transition duration-200 cursor-pointer"
                    >
                      <Cloud className="w-4 h-4" />
                      Conectar ao Google Drive
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Auto-Backup Frequency Config */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <Clock className="w-4 h-4 text-indigo-400" />
              Frequência de Backup Auto.
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Escolha a frequência com que o sistema salvará os backups automaticamente no seu Google Drive (caso conectado).
            </p>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {['disabled', 'daily', 'weekly', 'monthly'].map((freq) => (
                <button
                  key={freq}
                  onClick={() => onChangeBackupFrequency(freq)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                    backupFrequency === freq
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {getFrequencyLabel(freq)}
                </button>
              ))}
            </div>

            {backupFrequency !== 'disabled' && (
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-[10px] text-slate-400 leading-relaxed mt-1">
                <p>
                  <strong>Último auto-backup:</strong> {lastAutoBackupTime ? formatDate(lastAutoBackupTime) : 'Nunca realizado'}
                </p>
                <p className="mt-1 text-indigo-400">
                  * Os backups automáticos ocorrem de forma silenciosa em segundo plano durante o uso do app.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Manual Backups & Drive Files */}
        <div className="lg:col-span-2 flex flex-col gap-6 w-full">
          
          {/* Manual Backups Actions */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <FileJson className="w-4 h-4 text-indigo-400" />
              Ações de Backup Manual
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Export Local JSON */}
              <div className="rounded-2xl bg-slate-950/40 border border-white/5 p-4 flex flex-col justify-between gap-3 text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    Exportar JSON Local
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Baixe um arquivo de backup (.json) no seu computador.
                  </p>
                </div>
                <button
                  onClick={onExportLocal}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                >
                  Download JSON
                </button>
              </div>

              {/* Upload to Google Drive */}
              <div className="rounded-2xl bg-slate-950/40 border border-white/5 p-4 flex flex-col justify-between gap-3 text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                    Salvar no Google Drive
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Envia um backup imediato para o seu Google Drive na nuvem.
                  </p>
                </div>
                <button
                  onClick={onSaveToDrive}
                  disabled={!googleToken}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Salvar na Nuvem
                </button>
              </div>

              {/* Import Local JSON */}
              <div className="rounded-2xl bg-slate-950/40 border border-white/5 p-4 flex flex-col justify-between gap-3 text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    Importar JSON Local
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    Carregue um arquivo local para restaurar todos os dados.
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 hover:text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/20 hover:border-amber-500/30 transition cursor-pointer"
                >
                  Selecionar Arquivo
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
              </div>

            </div>
          </div>

          {/* Backup Files List in Google Drive */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col gap-4 overflow-hidden w-full">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Cloud className="w-4 h-4 text-indigo-400" />
                Arquivos de Backup no Google Drive
              </h3>
              
              {googleToken && (
                <button
                  onClick={onLoadDriveFiles}
                  disabled={isDriveLoading}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition cursor-pointer disabled:opacity-50"
                  title="Atualizar lista de arquivos"
                >
                  <RefreshCw className={`w-4 h-4 ${isDriveLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {!googleToken ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <CloudOff className="w-8 h-8 text-slate-600" />
                <p>Conecte sua conta do Google Drive para visualizar e gerenciar os backups salvos na nuvem.</p>
              </div>
            ) : isDriveLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span className="text-xs text-slate-400">Carregando backups do Google Drive...</span>
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-amber-500/60" />
                <p>Nenhum backup encontrado na sua pasta 'CaronasApp_Backups' do Google Drive.</p>
                <p className="text-[10px] text-slate-500">Clique em 'Salvar na Nuvem' acima para criar o primeiro backup.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-400 text-[11px] border-b border-white/5">Nome do Arquivo</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-400 text-[11px] border-b border-white/5 w-24">Tamanho</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-400 text-[11px] border-b border-white/5 w-36">Data de Criação</th>
                      <th className="text-center py-2 px-3 font-semibold text-slate-400 text-[11px] border-b border-white/5 w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {driveFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-2.5 px-3 border-b border-white/5 text-xs text-slate-200 font-semibold break-all">
                          {file.name}
                        </td>
                        <td className="py-2.5 px-3 border-b border-white/5 text-xs text-slate-400 text-right font-medium">
                          {formatSize(file.size)}
                        </td>
                        <td className="py-2.5 px-3 border-b border-white/5 text-xs text-slate-300 font-medium">
                          {formatDate(file.createdTime)}
                        </td>
                        <td className="py-2.5 px-3 border-b border-white/5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                if (window.confirm(`ATENÇÃO: Restaurar o backup "${file.name}" substituirá permanentemente todos os dados atuais. Deseja continuar?`)) {
                                  onRestoreFromDrive(file.id);
                                }
                              }}
                              className="py-1 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold text-[10px] transition cursor-pointer"
                              title="Restaurar backup"
                            >
                              Restaurar
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Deseja excluir permanentemente o backup "${file.name}" do seu Google Drive?`)) {
                                  onDeleteFromDrive(file.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                              title="Excluir backup"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
