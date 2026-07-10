import React, { useState, useEffect } from 'react';
import { loadData, saveData, getInitialData, getMonday, formatDateISO, getDriverStatus, getPassengerRate, DEFAULT_PASSENGERS } from './utils/storage';
import DateSelector from './components/DateSelector';
import SummarySidebar from './components/SummarySidebar';
import RidesTable from './components/RidesTable';
import PassengerModal from './components/PassengerModal';
import SelectWeekPassengersModal from './components/SelectWeekPassengersModal';
import MonthlySelector from './components/MonthlySelector';
import MonthlyTable from './components/MonthlyTable';
import RefuelingsView from './components/RefuelingsView';
import BackupView from './components/BackupView';
import PassengerRoutesTable from './components/PassengerRoutesTable';
import LoginView from './components/LoginView';
import { CarFront, Cloud, CloudOff, CalendarDays, CalendarRange, Fuel, Sun, Moon, LogOut, Database } from 'lucide-react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, getDocs, collection, query, orderBy, limit, getDoc } from 'firebase/firestore';

export default function App() {
  const isPublicView = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/passageiros') ||
    window.location.pathname.startsWith('/passageiro') ||
    window.location.hash.startsWith('#/passageiros') ||
    window.location.hash.startsWith('#/passageiro') ||
    window.location.hash === '#passageiros' ||
    window.location.hash === '#passageiro' ||
    new URLSearchParams(window.location.search).get('public') === 'true'
  );

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try {
      return localStorage.getItem('caronas_admin_logged_in') === 'true';
    } catch {
      return false;
    }
  });

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    try {
      localStorage.setItem('caronas_admin_logged_in', 'true');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    try {
      localStorage.removeItem('caronas_admin_logged_in');
    } catch (e) {
      console.error(e);
    }
  };

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('caronas_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    try {
      localStorage.setItem('caronas_theme', theme);
    } catch (e) {
      console.error(e);
    }
    const root = window.document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  // Load week state with June 2026 limit check
  const [state, setState] = useState(() => {
    const loaded = loadData();
    if (new Date(loaded.startDate + 'T00:00:00') < new Date('2026-06-01T00:00:00')) {
      loaded.startDate = '2026-06-01';
    }
    return loaded;
  });
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'monthly' | 'refuelings'
  
  const [googleClientId, setGoogleClientId] = useState(() => {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || localStorage.getItem('caronas_google_client_id') || '';
  });
  const [googleToken, setGoogleToken] = useState(() => {
    return localStorage.getItem('caronas_google_token') || '';
  });
  const [googleUser, setGoogleUser] = useState(() => {
    return localStorage.getItem('caronas_google_user') || '';
  });
  const [driveFiles, setDriveFiles] = useState([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState(() => {
    return localStorage.getItem('caronas_backup_frequency') || 'disabled';
  });
  const [lastAutoBackupTime, setLastAutoBackupTime] = useState(() => {
    const val = localStorage.getItem('caronas_last_auto_backup_time');
    return val ? parseInt(val, 10) : 0;
  });
  
  const [globalPassengers, setGlobalPassengers] = useState(() => {
    try {
      const stored = localStorage.getItem('caronas_global_passengers');
      return stored ? JSON.parse(stored) : DEFAULT_PASSENGERS;
    } catch (e) {
      console.error("Erro ao carregar passageiros globais do LocalStorage:", e);
      return DEFAULT_PASSENGERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('caronas_global_passengers', JSON.stringify(globalPassengers));
  }, [globalPassengers]);

  // Load global passengers from Firestore on start
  useEffect(() => {
    if (!db) return;

    const loadGlobalPassengersFromFirestore = async () => {
      try {
        const docRef = doc(db, 'settings', 'passengers');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.list) {
            skipGlobalPassengersSyncStatusChangeRef.current = true;
            setGlobalPassengers(data.list);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar passageiros globais do Firestore:", err);
        setSyncStatus('error');
      }
    };

    loadGlobalPassengersFromFirestore();
  }, [db]);

  const [refuelingsList, setRefuelingsList] = useState(() => {
    try {
      const stored = localStorage.getItem('caronas_abastecimentos_data');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Erro ao carregar abastecimentos do LocalStorage:", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('caronas_abastecimentos_data', JSON.stringify(refuelingsList));
  }, [refuelingsList]);

  // Load refuelings from Firestore on start
  useEffect(() => {
    if (!db) return;

    const loadRefuelingsFromFirestore = async () => {
      try {
        const docRef = doc(db, 'refuelings', 'all');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.list) {
            skipRefuelingsSyncStatusChangeRef.current = true;
            setRefuelingsList(data.list);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar abastecimentos do Firestore:", err);
        setSyncStatus('error');
      }
    };

    loadRefuelingsFromFirestore();
  }, [db]);

  const handleAddRefueling = (newRecord) => {
    setRefuelingsList(prev => [...prev, newRecord]);
  };

  const handleDeleteRefueling = (id) => {
    if (window.confirm("Tem certeza que deseja excluir este abastecimento?")) {
      setRefuelingsList(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleEditRefueling = (updatedRecord) => {
    setRefuelingsList(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  };

  const handleSaveRefuelings = async () => {
    if (!db) {
      alert("Firebase não configurado. Os dados estão salvos localmente.");
      return;
    }
    setSyncStatus('syncing');
    try {
      const docRef = doc(db, 'refuelings', 'all');
      await setDoc(docRef, {
        list: refuelingsList,
        updatedAt: new Date().toISOString()
      });
      setSyncStatus('synced');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Erro ao salvar abastecimentos no Firestore:", err);
      setSyncStatus('error');
      alert("Erro ao salvar dados na nuvem. Verifique suas regras do Firestore.");
    }
  };
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    // Ensure we don't start before June 2026
    if (today.getFullYear() < 2026 || (today.getFullYear() === 2026 && today.getMonth() < 5)) {
      return new Date(2026, 5, 1);
    }
    return today;
  });
  const activeMonth = viewMode === 'monthly'
    ? selectedMonth
    : new Date(new Date(state.startDate + 'T00:00:00').getFullYear(), new Date(state.startDate + 'T00:00:00').getMonth(), 1);
  const activeMonthTime = activeMonth.getTime();
  const [monthlyWeeksData, setMonthlyWeeksData] = useState({});
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectWeekModalOpen, setIsSelectWeekModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
    };
  }, []);

  const tokenClientRef = React.useRef(null);

  const initTokenClient = () => {
    if (!googleClientId) return null;
    if (tokenClientRef.current) return tokenClientRef.current;
    
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/drive.file',
          callback: (tokenResponse) => {
            if (tokenResponse.access_token) {
              const expiryTime = Date.now() + tokenResponse.expires_in * 1000;
              setGoogleToken(tokenResponse.access_token);
              localStorage.setItem('caronas_google_token', tokenResponse.access_token);
              localStorage.setItem('caronas_google_token_expiry', String(expiryTime));
              
              fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              })
              .then(res => res.json())
              .then(info => {
                if (info.email) {
                  setGoogleUser(info.email);
                  localStorage.setItem('caronas_google_user', info.email);
                  if (db) {
                    setDoc(doc(db, 'settings', 'google'), {
                      googleToken: tokenResponse.access_token,
                      googleTokenExpiry: expiryTime,
                      googleUser: info.email
                    }, { merge: true }).catch(err => console.error(err));
                  }
                }
              })
              .catch(() => {
                if (db) {
                  setDoc(doc(db, 'settings', 'google'), {
                    googleToken: tokenResponse.access_token,
                    googleTokenExpiry: expiryTime
                  }, { merge: true }).catch(err => console.error(err));
                }
              });
              
              alert("Google Drive conectado com sucesso!");
              loadDriveBackups(tokenResponse.access_token);
            }
          },
        });
        tokenClientRef.current = client;
        return client;
      } catch (err) {
        console.error("Erro ao inicializar token client:", err);
      }
    }
    return null;
  };

  const isTokenValid = () => {
    if (!googleToken) return false;
    const expiryStr = localStorage.getItem('caronas_google_token_expiry');
    if (!expiryStr) return false;
    const expiry = parseInt(expiryStr, 10);
    return Date.now() < expiry - 5 * 60 * 1000;
  };

  const handleSaveGoogleClientId = async (id) => {
    setGoogleClientId(id);
    localStorage.setItem('caronas_google_client_id', id);
    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'google'), { googleClientId: id }, { merge: true });
      } catch (err) {
        console.error("Erro ao salvar googleClientId no Firestore:", err);
      }
    }
  };

  const handleChangeBackupFrequency = async (freq) => {
    setBackupFrequency(freq);
    localStorage.setItem('caronas_backup_frequency', freq);
    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'google'), { backupFrequency: freq }, { merge: true });
      } catch (err) {
        console.error("Erro ao salvar backupFrequency no Firestore:", err);
      }
    }
  };

  const handleSaveLastAutoBackupTime = async (time) => {
    setLastAutoBackupTime(time);
    localStorage.setItem('caronas_last_auto_backup_time', String(time));
    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'google'), { lastAutoBackupTime: time }, { merge: true });
      } catch (err) {
        console.error("Erro ao salvar lastAutoBackupTime no Firestore:", err);
      }
    }
  };

  const handleConnectGoogle = () => {
    const client = initTokenClient();
    if (client) {
      client.requestAccessToken({ prompt: 'consent' });
    } else {
      alert("O script de login do Google está sendo carregado. Tente novamente em alguns segundos.");
    }
  };

  const handleDisconnectGoogle = async () => {
    if (googleToken && window.google && window.google.accounts && window.google.accounts.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(googleToken, () => {});
      } catch {}
    }
    setGoogleToken('');
    setGoogleUser('');
    setDriveFiles([]);
    localStorage.removeItem('caronas_google_token');
    localStorage.removeItem('caronas_google_token_expiry');
    localStorage.removeItem('caronas_google_user');
    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'google'), {
          googleToken: '',
          googleTokenExpiry: 0,
          googleUser: ''
        }, { merge: true });
      } catch (err) {
        console.error("Erro ao limpar dados do Google no Firestore:", err);
      }
    }
    alert("Google Drive desconectado.");
  };

  // Listen to Firestore Google Settings changes (for multi-origin sync)
  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(doc(db, 'settings', 'google'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.googleClientId !== undefined) {
          setGoogleClientId(data.googleClientId);
          localStorage.setItem('caronas_google_client_id', data.googleClientId);
        }
        
        if (data.googleToken !== undefined) {
          setGoogleToken(data.googleToken);
          localStorage.setItem('caronas_google_token', data.googleToken);
        }
        
        if (data.googleTokenExpiry !== undefined) {
          localStorage.setItem('caronas_google_token_expiry', String(data.googleTokenExpiry));
        } else {
          localStorage.removeItem('caronas_google_token_expiry');
        }
        
        if (data.googleUser !== undefined) {
          setGoogleUser(data.googleUser);
          localStorage.setItem('caronas_google_user', data.googleUser);
        }
        
        if (data.backupFrequency !== undefined) {
          setBackupFrequency(data.backupFrequency);
          localStorage.setItem('caronas_backup_frequency', data.backupFrequency);
        }
        
        if (data.lastAutoBackupTime !== undefined) {
          setLastAutoBackupTime(data.lastAutoBackupTime);
          localStorage.setItem('caronas_last_auto_backup_time', String(data.lastAutoBackupTime));
        }
      }
    }, (err) => {
      console.error("Erro ao escutar configurações do Google no Firestore:", err);
    });

    return () => unsubscribe();
  }, [db]);

  // Startup silent refresh logic
  useEffect(() => {
    if (!googleClientId) return;

    const checkAndRefresh = () => {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        if (googleToken && !isTokenValid()) {
          console.log("Token do Google expirado no início. Iniciando atualização silenciosa...");
          const client = initTokenClient();
          if (client) {
            try {
              client.requestAccessToken({ prompt: '' });
            } catch (err) {
              console.error("Erro ao tentar atualizar token silenciosamente:", err);
            }
          }
        }
      } else {
        setTimeout(checkAndRefresh, 1000);
      }
    };

    checkAndRefresh();
  }, [googleClientId, googleToken]);

  const getOrCreateBackupFolder = async (token) => {
    const queryStr = encodeURIComponent("name = 'CaronasApp_Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${queryStr}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await res.json();
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'CaronasApp_Backups',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    const folder = await createRes.json();
    return folder.id;
  };

  const uploadBackupToDrive = async (token, folderId, fileName, fileContent) => {
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json'
    };
    const boundary = 'caronas_app_backup_multipart_boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    const body = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(fileContent) +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro ao enviar: ${errText}`);
    }
    return await res.json();
  };

  const listBackupsFromDrive = async (token, folderId) => {
    const queryStr = encodeURIComponent(`'${folderId}' in parents and mimeType = 'application/json' and name contains 'CaronasApp_Backup_' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${queryStr}&orderBy=createdTime desc&fields=files(id,name,size,createdTime)&pageSize=30`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Erro ao buscar arquivos");
    const result = await res.json();
    return result.files || [];
  };

  const downloadFileContent = async (token, fileId) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Erro ao baixar");
    return await res.json();
  };

  const deleteFileFromDrive = async (token, fileId) => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Erro ao deletar");
    return true;
  };

  const loadDriveBackups = async (tokenToUse = googleToken) => {
    if (!tokenToUse) return;
    setIsDriveLoading(true);
    try {
      const folderId = await getOrCreateBackupFolder(tokenToUse);
      const files = await listBackupsFromDrive(tokenToUse, folderId);
      setDriveFiles(files);
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('401')) {
        handleDisconnectGoogle();
      }
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleSaveToDrive = async () => {
    if (!isTokenValid()) {
      alert("Token do Google Drive expirado. Por favor, conecte-se novamente.");
      handleDisconnectGoogle();
      return;
    }
    setIsDriveLoading(true);
    try {
      const folderId = await getOrCreateBackupFolder(googleToken);
      const data = await gatherAllSystemData();
      const now = new Date();
      const dateStr = formatDateISO(now);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      const fileName = `CaronasApp_Backup_Manual_${dateStr}_${timeStr}.json`;
      await uploadBackupToDrive(googleToken, folderId, fileName, data);
      alert("Backup salvo no Google Drive com sucesso!");
      loadDriveBackups(googleToken);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar backup no Google Drive.");
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleRestoreFromDrive = async (fileId) => {
    if (!isTokenValid()) {
      alert("Token do Google Drive expirado. Por favor, conecte-se novamente.");
      handleDisconnectGoogle();
      return;
    }
    setIsDriveLoading(true);
    try {
      const backupData = await downloadFileContent(googleToken, fileId);
      const success = await handleRestoreData(backupData);
      if (success) {
        setViewMode('weekly');
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao restaurar backup.");
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleDeleteFromDrive = async (fileId) => {
    if (!isTokenValid()) {
      alert("Token do Google Drive expirado. Por favor, conecte-se novamente.");
      handleDisconnectGoogle();
      return;
    }
    setIsDriveLoading(true);
    try {
      await deleteFileFromDrive(googleToken, fileId);
      alert("Backup removido do Google Drive.");
      loadDriveBackups(googleToken);
    } catch (err) {
      console.error(err);
      alert("Erro ao remover backup.");
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleExportLocal = async () => {
    try {
      const data = await gatherAllSystemData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const now = new Date();
      const dateStr = formatDateISO(now);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      downloadAnchor.setAttribute('download', `CaronasApp_Backup_${dateStr}_${timeStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar dados.");
    }
  };

  const handleImportLocal = async (parsedData) => {
    const success = await handleRestoreData(parsedData);
    if (success) {
      setViewMode('weekly');
    }
  };

  const gatherAllSystemData = async () => {
    const weeks = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === 'caronas_semanais_data') {
        try {
          const wData = JSON.parse(localStorage.getItem(key));
          if (wData && wData.startDate) {
            weeks[wData.startDate] = wData;
          }
        } catch {}
      } else if (key.startsWith('caronas_semanais_data_')) {
        const dateStr = key.replace('caronas_semanais_data_', '');
        try {
          const wData = JSON.parse(localStorage.getItem(key));
          if (wData) {
            weeks[dateStr] = wData;
          }
        } catch {}
      }
    }

    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'weeks'));
        querySnapshot.forEach((doc) => {
          weeks[doc.id] = {
            ...weeks[doc.id],
            ...doc.data()
          };
        });
      } catch (err) {
        console.error("Erro ao carregar semanas do Firestore:", err);
      }
    }

    return {
      globalPassengers: globalPassengers,
      refuelings: refuelingsList,
      weeks: weeks
    };
  };

  const handleRestoreData = async (backupData) => {
    if (!backupData || !backupData.weeks) {
      alert("Formato de backup inválido.");
      return false;
    }

    try {
      if (Array.isArray(backupData.globalPassengers)) {
        setGlobalPassengers(backupData.globalPassengers);
        localStorage.setItem('caronas_global_passengers', JSON.stringify(backupData.globalPassengers));
        if (db) {
          try {
            await setDoc(doc(db, 'settings', 'passengers'), {
              list: backupData.globalPassengers,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (Array.isArray(backupData.refuelings)) {
        setRefuelingsList(backupData.refuelings);
        localStorage.setItem('caronas_abastecimentos_data', JSON.stringify(backupData.refuelings));
        if (db) {
          try {
            await setDoc(doc(db, 'refuelings', 'all'), {
              list: backupData.refuelings,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.error(e);
          }
        }
      }

      const weekEntries = Object.entries(backupData.weeks);
      for (const [startDate, weekData] of weekEntries) {
        localStorage.setItem(`caronas_semanais_data_${startDate}`, JSON.stringify(weekData));
        if (startDate === state.startDate) {
          setState(weekData);
          localStorage.setItem('caronas_semanais_data', JSON.stringify(weekData));
        }
        if (db) {
          try {
            await setDoc(doc(db, 'weeks', startDate), {
              ...weekData,
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (viewMode === 'monthly') {
        setSelectedMonth(prev => new Date(prev));
      }

      alert("Backup restaurado com sucesso!");
      return true;
    } catch (err) {
      console.error(err);
      alert("Erro ao restaurar backup.");
      return false;
    }
  };

  useEffect(() => {
    if (googleToken && isTokenValid()) {
      loadDriveBackups(googleToken);
    }
  }, [googleToken]);

  // Auto-backup to Google Drive check
  useEffect(() => {
    if (backupFrequency === 'disabled') return;
    if (!googleToken) return;

    // Try to silently refresh token if it is expired
    if (!isTokenValid()) {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) {
        console.log("Token expirado antes do auto-backup. Tentando atualização silenciosa...");
        const client = initTokenClient();
        if (client) {
          try {
            client.requestAccessToken({ prompt: '' });
          } catch (err) {
            console.error("Erro ao atualizar token para auto-backup:", err);
          }
        }
      }
      return;
    }

    const now = Date.now();
    let shouldBackup = false;

    if (lastAutoBackupTime === 0) {
      shouldBackup = true;
    } else {
      const diffMs = now - lastAutoBackupTime;
      const oneDay = 24 * 60 * 60 * 1000;

      if (backupFrequency === 'daily' && diffMs >= oneDay) {
        shouldBackup = true;
      } else if (backupFrequency === 'weekly' && diffMs >= 7 * oneDay) {
        shouldBackup = true;
      } else if (backupFrequency === 'monthly' && diffMs >= 30 * oneDay) {
        shouldBackup = true;
      }
    }

    if (shouldBackup) {
      const timer = setTimeout(async () => {
        try {
          const folderId = await getOrCreateBackupFolder(googleToken);
          const data = await gatherAllSystemData();
          const nowObj = new Date();
          const dateStr = formatDateISO(nowObj);
          const fileName = `CaronasApp_Backup_Auto_${dateStr}.json`;
          await uploadBackupToDrive(googleToken, folderId, fileName, data);
          console.log(`Backup automático realizado: ${fileName}`);
          
          await handleSaveLastAutoBackupTime(now);
          loadDriveBackups(googleToken);
        } catch (err) {
          console.error("Erro no auto-backup:", err);
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [backupFrequency, googleToken, lastAutoBackupTime]);

  const [syncStatus, setSyncStatus] = useState(() => (db ? 'loading' : 'local-only'));

  const skipSyncStatusChangeRef = React.useRef(false);
  const skipRefuelingsSyncStatusChangeRef = React.useRef(false);
  const skipGlobalPassengersSyncStatusChangeRef = React.useRef(false);

  // Helper to ensure cell states are objects with status and value fields (defensive parsing)
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

  // Compare local state with remote state to prevent infinite loops
  const isDataEqual = (a, b) => {
    if (!a || !b) return false;
    return (
      a.startDate === b.startDate &&
      a.gasPrice === b.gasPrice &&
      a.carEfficiency === b.carEfficiency &&
      a.dailyBasicValue === b.dailyBasicValue &&
      a.dailyConsumption === b.dailyConsumption &&
      a.pixKey === b.pixKey &&
      JSON.stringify(a.driverOffDays) === JSON.stringify(b.driverOffDays) &&
      JSON.stringify(a.driverStatus) === JSON.stringify(b.driverStatus) &&
      JSON.stringify(a.passengers) === JSON.stringify(b.passengers) &&
      JSON.stringify(a.cellStates) === JSON.stringify(b.cellStates)
    );
  };

  // Helper to calculate all Mondays in selectedMonth
  const getMondaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const mondays = [];
    
    const d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      if (d.getDay() === 1) { // 1 = Monday
        mondays.push(formatDateISO(new Date(d)));
      }
      d.setDate(d.getDate() + 1);
    }
    return mondays;
  };

  // Auto-sync cell states if passengers list changes
  const syncCellStates = (updatedPassengers, currentCells) => {
    const newCells = { ...currentCells };
    updatedPassengers.forEach(p => {
      if (!newCells[p.id]) {
        newCells[p.id] = {};
        for (let day = 0; day < 7; day++) {
          newCells[p.id][day] = { status: 'neutral', value: 0 };
        }
      }
    });
    return newCells;
  };

  // 1. One-time Firestore read on week change (no real-time listener)
  useEffect(() => {
    if (!db) {
      setSyncStatus('local-only');
      const loaded = loadData(state.startDate);
      const key = `caronas_semanais_data_${state.startDate}`;
      const exists = localStorage.getItem(key) !== null;
      
      let passengersToUse = loaded.passengers;
      let cellStatesToUse = loaded.cellStates;
      if (!exists) {
        passengersToUse = [];
        cellStatesToUse = {};
      }
      
      const nextData = {
        ...loaded,
        passengers: passengersToUse,
        cellStates: cellStatesToUse
      };
      
      setState(currentLocal => {
        if (currentLocal.startDate === nextData.startDate && isDataEqual(currentLocal, nextData)) {
          return currentLocal;
        }
        skipSyncStatusChangeRef.current = true;
        return nextData;
      });
      return;
    }

    const loadWeekFromFirestore = async () => {
      setSyncStatus('loading');
      try {
        const docRef = doc(db, 'weeks', state.startDate);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          setState(currentLocal => {
            if (isDataEqual(currentLocal, remoteData)) {
              setSyncStatus('synced');
              return currentLocal;
            }
            skipSyncStatusChangeRef.current = true;
            setSyncStatus('synced');
            return {
              ...currentLocal,
              ...remoteData
            };
          });
        } else {
          // Document doesn't exist. Pre-fill configs from the latest week but don't write to DB yet.
          const weeksColl = collection(db, 'weeks');
          const q = query(weeksColl, orderBy('startDate', 'desc'), limit(1));
          const querySnap = await getDocs(q);

          let gasPriceToUse = state.gasPrice;
          let dailyBasicToUse = state.dailyBasicValue;
          let dailyConsumptionToUse = state.dailyConsumption;
          let carEfficiencyToUse = state.carEfficiency || 12;
          let pixKeyToUse = state.pixKey || '';

          if (!querySnap.empty) {
            const latestDoc = querySnap.docs[0].data();
            gasPriceToUse = latestDoc.gasPrice ?? state.gasPrice;
            dailyBasicToUse = latestDoc.dailyBasicValue ?? state.dailyBasicValue;
            dailyConsumptionToUse = latestDoc.dailyConsumption ?? state.dailyConsumption;
            carEfficiencyToUse = latestDoc.carEfficiency ?? (state.carEfficiency || 12);
            pixKeyToUse = latestDoc.pixKey ?? (state.pixKey || '');
          }

          const initialCells = {};

          const initialDriverStatus = {
            0: 'neutral', 1: 'neutral', 2: 'neutral', 3: 'neutral', 4: 'neutral', 5: 'neutral', 6: 'neutral'
          };
          const initialDriverOff = {
            0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false
          };

          const newWeekData = {
            startDate: state.startDate,
            gasPrice: gasPriceToUse,
            carEfficiency: carEfficiencyToUse,
            dailyBasicValue: dailyBasicToUse,
            dailyConsumption: dailyConsumptionToUse,
            driverStatus: initialDriverStatus,
            driverOffDays: initialDriverOff,
            passengers: [],
            cellStates: initialCells,
            pixKey: pixKeyToUse,
          };

          skipSyncStatusChangeRef.current = true;
          setState(newWeekData);
          setSyncStatus('offline'); // Unsaved local state initially
        }
      } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        setSyncStatus('error');
      }
    };

    loadWeekFromFirestore();
  }, [state.startDate, db]);

  // Mark status as offline (unsaved changes) when local state is updated
  useEffect(() => {
    if (skipSyncStatusChangeRef.current) {
      skipSyncStatusChangeRef.current = false;
      return;
    }
    if (syncStatus === 'synced') {
      setSyncStatus('offline');
    }
  }, [state]);

  // Mark status as offline (unsaved changes) when refuelings are updated
  useEffect(() => {
    if (skipRefuelingsSyncStatusChangeRef.current) {
      skipRefuelingsSyncStatusChangeRef.current = false;
      return;
    }
    if (syncStatus === 'synced') {
      setSyncStatus('offline');
    }
  }, [refuelingsList]);

  // Mark status as offline (unsaved changes) when global passengers are updated
  useEffect(() => {
    if (skipGlobalPassengersSyncStatusChangeRef.current) {
      skipGlobalPassengersSyncStatusChangeRef.current = false;
      return;
    }
    if (syncStatus === 'synced') {
      setSyncStatus('offline');
    }
  }, [globalPassengers]);

  // 3. Keep LocalStorage in sync immediately (always acts as local cache fallback)
  useEffect(() => {
    saveData(state);
  }, [state]);

  // 4. Autosave weekly state to Firestore with debounce
  useEffect(() => {
    if (isPublicView) return;
    if (syncStatus === 'local-only' || syncStatus === 'loading') return;
    if (syncStatus !== 'offline') return;

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        if (db) {
          const docRef = doc(db, 'weeks', state.startDate);
          await setDoc(docRef, {
            startDate: state.startDate,
            gasPrice: state.gasPrice,
            carEfficiency: state.carEfficiency || 12,
            dailyBasicValue: state.dailyBasicValue,
            dailyConsumption: state.dailyConsumption,
            driverOffDays: state.driverOffDays,
            driverStatus: state.driverStatus || {},
            passengers: state.passengers,
            cellStates: state.cellStates,
            pixKey: state.pixKey || '',
            driverNotes: state.driverNotes || {},
            passengerNotes: state.passengerNotes || {},
            updatedAt: new Date().toISOString()
          });
        }
        setSyncStatus('synced');
      } catch (err) {
        console.error("Erro no salvamento automático:", err);
        setSyncStatus('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [state, db, isPublicView, syncStatus]);

  // 5. Autosave refuelings to Firestore with debounce
  useEffect(() => {
    if (isPublicView) return;
    if (syncStatus === 'local-only' || syncStatus === 'loading') return;
    if (syncStatus !== 'offline') return;

    const timer = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        if (db) {
          const docRef = doc(db, 'refuelings', 'all');
          await setDoc(docRef, {
            list: refuelingsList,
            updatedAt: new Date().toISOString()
          });
        }
        setSyncStatus('synced');
      } catch (err) {
        console.error("Erro no salvamento automático de abastecimentos:", err);
        setSyncStatus('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [refuelingsList, db, isPublicView, syncStatus]);

  // 4. Batch load all weeks for the active month (triggers when activeMonth or active week updates)
  useEffect(() => {
    const fetchMonthlyData = async () => {
      setIsMonthlyLoading(true);
      const mondays = getMondaysInMonth(activeMonth);
      const results = {};

      for (const mon of mondays) {
        let weekData = null;

        // Check active week
        if (state.startDate === mon) {
          weekData = state;
        }

        // Fetch from Firestore
        if (!weekData && db) {
          try {
            const docRef = doc(db, 'weeks', mon);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              weekData = docSnap.data();
            }
          } catch (e) {
            console.error(`Erro ao buscar semana ${mon} do Firestore:`, e);
          }
        }

        // Fallback to LocalStorage
        if (!weekData) {
          weekData = loadData(mon);
        }

        if (weekData) {
          results[mon] = weekData;
        }
      }

      setMonthlyWeeksData(results);
      setIsMonthlyLoading(false);
    };

    fetchMonthlyData();
  }, [activeMonthTime, state.startDate, state, db]);

  const handleSave = async () => {
    // 1. Save locally
    const successLocal = saveData(state);
    if (successLocal) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }

    // 2. Save online to Firestore
    if (db) {
      setSyncStatus('syncing');
      try {
        const docRef = doc(db, 'weeks', state.startDate);
        await setDoc(docRef, {
          startDate: state.startDate,
          gasPrice: state.gasPrice,
          carEfficiency: state.carEfficiency || 12,
          dailyBasicValue: state.dailyBasicValue,
          dailyConsumption: state.dailyConsumption,
          driverOffDays: state.driverOffDays,
          driverStatus: state.driverStatus || {},
          passengers: state.passengers,
          cellStates: state.cellStates,
          pixKey: state.pixKey || '',
          updatedAt: new Date().toISOString()
        });
        setSyncStatus('synced');
      } catch (err) {
        console.error("Erro ao salvar no Firestore:", err);
        setSyncStatus('error');
        alert("Erro ao salvar na nuvem. Verifique sua conexão ou permissões do Firebase.");
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza de que deseja resetar os dados desta semana? Todos os marcadores voltarão ao padrão.')) {
      const initial = getInitialData();
      setState(prev => ({
        ...prev,
        driverStatus: initial.driverStatus,
        driverOffDays: initial.driverOffDays,
        cellStates: syncCellStates(prev.passengers, {}),
        startDate: formatDateISO(getMonday(new Date()))
      }));
    }
  };

  // Passenger Handlers
  const handleSaveGlobalPassengers = async (updatedGlobalPassengers) => {
    setGlobalPassengers(updatedGlobalPassengers);
    
    // Save to LocalStorage immediately
    try {
      localStorage.setItem('caronas_global_passengers', JSON.stringify(updatedGlobalPassengers));
    } catch (e) {
      console.error("Erro ao salvar passageiros globais localmente:", e);
    }

    // Save to Firestore settings/passengers
    if (db) {
      setSyncStatus('syncing');
      try {
        const docRef = doc(db, 'settings', 'passengers');
        await setDoc(docRef, {
          list: updatedGlobalPassengers,
          updatedAt: new Date().toISOString()
        });
        setSyncStatus('synced');
      } catch (err) {
        console.error("Erro ao salvar passageiros globais no Firestore:", err);
        setSyncStatus('error');
        alert("Erro ao salvar passageiros globais na nuvem. Verifique suas regras do Firestore.");
      }
    }
  };

  const handleSaveWeekPassengers = (selectedIds) => {
    setState(prev => {
      const nextPassengers = [];
      const nextCells = { ...prev.cellStates };
      
      selectedIds.forEach(id => {
        const globalP = globalPassengers.find(p => p.id === id);
        if (globalP) {
          const existingP = prev.passengers.find(p => p.id === id);
          nextPassengers.push(existingP || {
            ...globalP,
            route: {
              ida: { from: '', to: '', km: globalP.defaultIdaKm ?? 0 },
              volta: { from: '', to: '', km: globalP.defaultVoltaKm ?? 0 }
            }
          });
          
          if (!nextCells[id]) {
            nextCells[id] = {};
            for (let day = 0; day < 7; day++) {
              nextCells[id][day] = { status: 'neutral', value: 0 };
            }
          }
        }
      });
      
      const activeIds = nextPassengers.map(p => p.id);
      Object.keys(nextCells).forEach(id => {
        if (!activeIds.includes(id)) {
          delete nextCells[id];
        }
      });
      
      return {
        ...prev,
        passengers: nextPassengers,
        cellStates: nextCells
      };
    });
  };

  const handleRemovePassengerFromWeek = (passengerId) => {
    setState(prev => {
      const nextPassengers = prev.passengers.filter(p => p.id !== passengerId);
      const nextCells = { ...prev.cellStates };
      delete nextCells[passengerId];
      
      return {
        ...prev,
        passengers: nextPassengers,
        cellStates: nextCells
      };
    });
  };

  // Cell status toggling (Cycles: neutral -> present -> paid -> off -> neutral)
  const handleToggleCell = (passengerId, dayIdx) => {
    setState(prev => {
      const passenger = prev.passengers.find(p => p.id === passengerId);
      const defaultRate = passenger ? passenger.defaultRate : 8.00;
      
      const cell = prev.cellStates[passengerId]?.[dayIdx];
      const cellObj = getCellObject(cell, defaultRate);
      
      let nextStatus = 'neutral';
      let nextValue = 0;
      
      if (cellObj.status === 'neutral') {
        nextStatus = 'present';
        nextValue = defaultRate;
      } else if (cellObj.status === 'present') {
        nextStatus = 'paid';
        nextValue = cellObj.value || defaultRate;
      } else if (cellObj.status === 'paid') {
        nextStatus = 'off';
        nextValue = 0;
      } else {
        nextStatus = 'neutral';
        nextValue = 0;
      }
      
      return {
        ...prev,
        cellStates: {
          ...prev.cellStates,
          [passengerId]: {
            ...prev.cellStates[passengerId],
            [dayIdx]: { status: nextStatus, value: nextValue }
          }
        }
      };
    });
  };

  // Edit custom value for a cell
  const handleCellValChange = (passengerId, dayIdx, newValue) => {
    const val = parseFloat(newValue);
    const parsedVal = isNaN(val) ? 0 : val;
    
    setState(prev => {
      const currentCell = prev.cellStates[passengerId]?.[dayIdx];
      const currentStatus = (currentCell && typeof currentCell === 'object' && currentCell.status) 
        ? currentCell.status 
        : 'present';

      return {
        ...prev,
        cellStates: {
          ...prev.cellStates,
          [passengerId]: {
            ...prev.cellStates[passengerId],
            [dayIdx]: {
              status: currentStatus,
              value: parsedVal
            }
          }
        }
      };
    });
  };

  const handleUpdateDriverNote = (dayIdx, note) => {
    setState(prev => ({
      ...prev,
      driverNotes: {
        ...(prev.driverNotes || {}),
        [dayIdx]: note
      }
    }));
  };

  const handleUpdatePassengerNote = (passengerId, dayIdx, note) => {
    setState(prev => ({
      ...prev,
      passengerNotes: {
        ...(prev.passengerNotes || {}),
        [passengerId]: {
          ...(prev.passengerNotes?.[passengerId] || {}),
          [dayIdx]: note
        }
      }
    }));
  };

  // Driver Status toggling (Cycles: neutral -> active -> off -> neutral)
  const handleToggleDriverStatus = (dayIdx) => {
    setState(prev => {
      const currentStatus = getDriverStatus(dayIdx, prev.driverStatus, prev.driverOffDays);
      let nextStatus = 'neutral';
      
      if (currentStatus === 'neutral') {
        nextStatus = 'active';
      } else if (currentStatus === 'active') {
        nextStatus = 'off';
      } else {
        nextStatus = 'neutral';
      }
      
      const newDriverStatus = {
        ...(prev.driverStatus || {}),
        [dayIdx]: nextStatus
      };
      
      const newDriverOffDays = {
        ...(prev.driverOffDays || {}),
        [dayIdx]: nextStatus === 'off'
      };
      
      return {
        ...prev,
        driverStatus: newDriverStatus,
        driverOffDays: newDriverOffDays
      };
    });
  };

  const handleGasPriceChange = (price) => {
    setState(prev => ({ ...prev, gasPrice: price }));
  };

  const handleCarEfficiencyChange = (eff) => {
    setState(prev => ({ ...prev, carEfficiency: eff }));
  };

  const handlePixKeyChange = (key) => {
    setState(prev => ({ ...prev, pixKey: key }));
  };

  const handleUpdatePassengerRoute = (passengerId, routeType, field, value) => {
    setState(prev => {
      const nextPassengers = prev.passengers.map(p => {
        if (p.id === passengerId) {
          const route = p.route || { ida: { from: '', to: '', km: 0 }, volta: { from: '', to: '', km: 0 } };
          const subRoute = route[routeType] || { from: '', to: '', km: 0 };
          return {
            ...p,
            route: {
              ...route,
              [routeType]: {
                ...subRoute,
                [field]: value
              }
            }
          };
        }
        return p;
      });

      return {
        ...prev,
        passengers: nextPassengers
      };
    });
  };

  const handleDailyBasicValueChange = (val) => {
    setState(prev => ({ ...prev, dailyBasicValue: val }));
  };

  const handleDailyConsumptionChange = (val) => {
    setState(prev => ({ ...prev, dailyConsumption: val }));
  };

  const handleStartDateChange = async (newDate) => {
    if (new Date(newDate + 'T00:00:00') < new Date('2026-06-01T00:00:00')) {
      newDate = '2026-06-01';
    }
    if (syncStatus === 'offline' && db) {
      try {
        const docRef = doc(db, 'weeks', state.startDate);
        await setDoc(docRef, {
          startDate: state.startDate,
          gasPrice: state.gasPrice,
          carEfficiency: state.carEfficiency || 12,
          dailyBasicValue: state.dailyBasicValue,
          dailyConsumption: state.dailyConsumption,
          driverOffDays: state.driverOffDays,
          driverStatus: state.driverStatus || {},
          passengers: state.passengers,
          cellStates: state.cellStates,
          pixKey: state.pixKey || '',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Erro ao salvar antes de mudar de semana:", err);
      }
    }
    setState(prev => ({ ...prev, startDate: newDate }));
  };

  const handleMonthChange = (newMonth) => {
    if (newMonth.getFullYear() < 2026 || (newMonth.getFullYear() === 2026 && newMonth.getMonth() < 5)) {
      newMonth = new Date(2026, 5, 1); // Force to June 2026
    }
    setSelectedMonth(newMonth);
  };

  // Shortcut: click monthly cell/header to navigate to weekly editor
  const handleJumpToWeek = async (mondayISO) => {
    if (syncStatus === 'offline' && db) {
      try {
        const docRef = doc(db, 'weeks', state.startDate);
        await setDoc(docRef, {
          startDate: state.startDate,
          gasPrice: state.gasPrice,
          carEfficiency: state.carEfficiency || 12,
          dailyBasicValue: state.dailyBasicValue,
          dailyConsumption: state.dailyConsumption,
          driverOffDays: state.driverOffDays,
          driverStatus: state.driverStatus || {},
          passengers: state.passengers,
          cellStates: state.cellStates,
          pixKey: state.pixKey || '',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Erro ao salvar antes de saltar para semana:", err);
      }
    }
    const weekData = monthlyWeeksData[mondayISO] || loadData(mondayISO);
    setState(prev => ({
      ...prev,
      ...weekData,
      startDate: mondayISO
    }));
    setViewMode('weekly');
  };

  // Financial calculations - Weekly
  const calculateWeeklyTotals = () => {
    let totalGross = 0;
    let activeDaysCount = 0;

    for (let day = 0; day < 7; day++) {
      const dStatus = getDriverStatus(day, state.driverStatus, state.driverOffDays);
      if (dStatus === 'active') {
        activeDaysCount++;
      }
    }

    state.passengers.forEach(p => {
      for (let day = 0; day < 7; day++) {
        const dStatus = getDriverStatus(day, state.driverStatus, state.driverOffDays);
        if (dStatus === 'off' || dStatus === 'neutral') continue;
        const cell = state.cellStates[p.id]?.[day];
        const cellObj = getCellObject(cell, p.defaultRate);
        if (cellObj.status === 'present' || cellObj.status === 'paid') {
          totalGross += cellObj.value;
        }
      }
    });

    return {
      totalGross,
      totalNet: totalGross - (state.gasPrice * state.dailyConsumption) * activeDaysCount,
      activeDaysCount
    };
  };

  // Financial calculations - Monthly (Aggregated)
  const calculateMonthlyTotals = () => {
    const mondays = getMondaysInMonth(selectedMonth);
    let totalGross = 0;
    let totalExpenses = 0;
    let totalActiveDays = 0;

    mondays.forEach((mon) => {
      const weekData = monthlyWeeksData[mon];
      if (!weekData) return;

      // Active days count in this week
      let weekActiveDays = 0;
      for (let day = 0; day < 7; day++) {
        const dStatus = getDriverStatus(day, weekData.driverStatus, weekData.driverOffDays);
        if (dStatus === 'active') {
          weekActiveDays++;
        }
      }
      totalActiveDays += weekActiveDays;

      // Gross in this week
      let weekGross = 0;
      weekData.passengers?.forEach((p) => {
        for (let day = 0; day < 7; day++) {
          const dStatus = getDriverStatus(day, weekData.driverStatus, weekData.driverOffDays);
          if (dStatus === 'off' || dStatus === 'neutral') continue;
          const cell = weekData.cellStates?.[p.id]?.[day];
          const cellObj = getCellObject(cell, p.defaultRate);
          if (cellObj.status === 'present' || cellObj.status === 'paid') {
            weekGross += cellObj.value;
          }
        }
      });
      totalGross += weekGross;

      // Expenses in this week
      const weekExpenses =
        (weekData.gasPrice ?? 5.99) * (weekData.dailyConsumption ?? 3.5) *
        weekActiveDays;
      totalExpenses += weekExpenses;
    });

    return {
      monthlyGross: totalGross,
      monthlyNet: totalGross - totalExpenses,
      monthlyActiveDays: totalActiveDays,
      monthlyExpenses: totalExpenses
    };
  };

  // Resolve average params for month view display
  const getMonthlyAverages = () => {
    const mondays = getMondaysInMonth(selectedMonth);
    let count = 0;
    let sumGas = 0;
    let sumDaily = 0;
    let sumConsumption = 0;
    let sumEfficiency = 0;

    mondays.forEach((mon) => {
      const weekData = monthlyWeeksData[mon];
      if (weekData) {
        sumGas += weekData.gasPrice ?? 5.99;
        sumDaily += weekData.dailyBasicValue ?? 21.00;
        sumConsumption += weekData.dailyConsumption ?? 3.5;
        sumEfficiency += weekData.carEfficiency ?? 12.0;
        count++;
      }
    });

    if (count === 0) {
      return {
        avgGas: state.gasPrice,
        avgDaily: state.dailyBasicValue,
        avgConsumption: state.dailyConsumption,
        avgEfficiency: state.carEfficiency || 12.0
      };
    }

    return {
      avgGas: sumGas / count,
      avgDaily: sumDaily / count,
      avgConsumption: sumConsumption / count,
      avgEfficiency: sumEfficiency / count
    };
  };

  // Compile calculations depending on mode
  const isMonthly = viewMode === 'monthly';
  const { totalGross, totalNet, activeDaysCount } = calculateWeeklyTotals();
  const { monthlyGross, monthlyNet, monthlyActiveDays } = calculateMonthlyTotals();
  const { avgGas, avgDaily, avgConsumption, avgEfficiency } = getMonthlyAverages();  const activeViewMode = (isPublicView && viewMode === 'refuelings') ? 'weekly' : viewMode;

  // Get passenger monthly totals map for RidesTable BRL column
  const getPassengerMonthlyTotalsMap = () => {
    const mondays = getMondaysInMonth(activeMonth);
    const totals = {};
    
    state.passengers.forEach(p => {
      let total = 0;
      mondays.forEach(mon => {
        const weekData = state.startDate === mon ? state : monthlyWeeksData[mon];
        if (!weekData) return;
        
        const pConfig = weekData.passengers?.find(wp => wp.id === p.id);
        const defaultRate = pConfig 
          ? getPassengerRate(pConfig, weekData.carEfficiency || 12, weekData.gasPrice || 5.99)
          : p.defaultRate;
          
        for (let day = 0; day < 7; day++) {
          const dStatus = getDriverStatus(day, weekData.driverStatus, weekData.driverOffDays);
          if (dStatus === 'off' || dStatus === 'neutral') continue;
          
          const cell = weekData.cellStates?.[p.id]?.[day];
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
      });
      totals[p.id] = total;
    });
    
    return totals;
  };

  const passengerMonthlyTotals = getPassengerMonthlyTotalsMap();
  const activeMonthNameString = activeMonth.toLocaleDateString('pt-BR', { month: 'long' });
  const formattedActiveMonthName = activeMonthNameString.charAt(0).toUpperCase() + activeMonthNameString.slice(1);

  if (!isPublicView && !isAdminLoggedIn) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="relative min-h-screen w-full px-4 py-8 md:px-8 overflow-hidden">
      
      {/* Decorative Blur Spheres (Background) Wrapper to clip overflow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px] animate-float-delayed" />
      </div>

      {/* Main Container */}
      <div className="relative max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Header App Title */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-white/5 w-full">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25">
              <CarFront className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-50 to-slate-200">
                Caronas da Semana
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Gestão simplificada e rateio inteligente de corridas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
            {/* View Mode Segmented Control */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition duration-200 flex items-center gap-1 ${
                  activeViewMode === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Semanal
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition duration-200 flex items-center gap-1 ${
                  activeViewMode === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Mensal
              </button>
              {!isPublicView && (
                <button
                  onClick={() => setViewMode('refuelings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition duration-200 flex items-center gap-1 ${
                    activeViewMode === 'refuelings'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Fuel className="w-3.5 h-3.5" />
                  Abastecimentos
                </button>
              )}
              {!isPublicView && (
                <button
                  onClick={() => setViewMode('backup')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition duration-200 flex items-center gap-1 ${
                    activeViewMode === 'backup'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  Backup
                </button>
              )}
            </div>

            {/* Cloud status badge */}
            <div className="flex items-center gap-2 bg-slate-900/60 border border-white/5 rounded-full px-4 py-2 text-xs font-semibold">
              {syncStatus === 'local-only' && (
                <>
                  <CloudOff className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-500" title="Firebase não configurado no arquivo .env. As alterações serão salvas apenas neste navegador localmente.">Apenas Local (Sem Nuvem)</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <CloudOff className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="text-red-500" title="Ocorreu um erro ao sincronizar com o banco de dados. Suas regras do Firestore podem ter expirado ou há um erro de credencial.">Erro na Nuvem</span>
                </>
              )}
              {syncStatus === 'offline' && (
                <>
                  <Cloud className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="text-amber-300" title="Você fez alterações locais que ainda não foram salvas na nuvem. Clique em 'Salvar Semana' ou 'Salvar Histórico'.">Pendente de Salvamento</span>
                </>
              )}
              {syncStatus === 'loading' && (
                <>
                  <Cloud className="w-4 h-4 text-blue-400 animate-pulse" />
                  <span className="text-blue-300">Conectando...</span>
                </>
              )}
              {syncStatus === 'syncing' && (
                <>
                  <Cloud className="w-4 h-4 text-indigo-400 animate-bounce" />
                  <span className="text-indigo-300">Sincronizando...</span>
                </>
              )}
              {syncStatus === 'synced' && (
                <>
                  <Cloud className="w-4 h-4 text-emerald-400 glow-green" />
                  <span className="text-emerald-400 font-semibold">Sincronizado</span>
                </>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 rounded-xl text-slate-300 hover:text-slate-100 transition cursor-pointer flex items-center justify-center"
              title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            >
              {theme === 'dark' ? <Sun className="w-5.5 h-5.5" /> : <Moon className="w-5.5 h-5.5" />}
            </button>

            {/* Logout Button */}
            {!isPublicView && isAdminLoggedIn && (
              <button
                onClick={handleLogout}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition cursor-pointer flex items-center justify-center"
                title="Sair da Área Administrativa"
              >
                <LogOut className="w-5.5 h-5.5" />
              </button>
            )}
          </div>
        </header>

        {/* Public Warning Banner */}
        {isPublicView && (
          <div className="w-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs md:text-sm font-semibold shadow-lg shadow-indigo-950/20">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>Visualização Pública — Modo de Leitura</span>
          </div>
        )}

        {/* Date Selector depending on View Mode */}
        {activeViewMode === 'monthly' ? (
          <MonthlySelector 
            selectedMonth={selectedMonth}
            onChangeMonth={handleMonthChange}
          />
        ) : activeViewMode === 'weekly' ? (
          <DateSelector 
            startDate={state.startDate}
            onChangeStartDate={handleStartDateChange}
          />
        ) : null}

        {/* Core Layout Grid */}
        <main className="flex flex-col lg:flex-row gap-6 items-start w-full">
          {activeViewMode === 'backup' ? (
            <BackupView
              googleClientId={googleClientId}
              onSaveGoogleClientId={handleSaveGoogleClientId}
              googleToken={googleToken}
              googleUser={googleUser}
              onConnectGoogle={handleConnectGoogle}
              onDisconnectGoogle={handleDisconnectGoogle}
              backupFrequency={backupFrequency}
              onChangeBackupFrequency={handleChangeBackupFrequency}
              lastAutoBackupTime={lastAutoBackupTime}
              onExportLocal={handleExportLocal}
              onImportLocal={handleImportLocal}
              onSaveToDrive={handleSaveToDrive}
              driveFiles={driveFiles}
              onLoadDriveFiles={() => loadDriveBackups(googleToken)}
              onRestoreFromDrive={handleRestoreFromDrive}
              onDeleteFromDrive={handleDeleteFromDrive}
              isDriveLoading={isDriveLoading}
            />
          ) : activeViewMode === 'refuelings' ? (
            <RefuelingsView
              refuelings={refuelingsList}
              startDate={state.startDate}
              selectedMonth={selectedMonth}
              onAddRefueling={handleAddRefueling}
              onEditRefueling={handleEditRefueling}
              onDeleteRefueling={handleDeleteRefueling}
              onSaveRefuelings={handleSaveRefuelings}
              syncStatus={syncStatus}
            />
          ) : (
            <>
              {/* Main Grid / Table depending on View Mode */}
              {activeViewMode === 'monthly' ? (
                isMonthlyLoading ? (
                  <div className="glass-panel rounded-3xl p-12 shadow-xl border border-white/10 flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-slate-300 font-medium">Consolidando fechamento mensal...</span>
                  </div>
                ) : (
                  <MonthlyTable
                    weeksData={monthlyWeeksData}
                    mondayDates={getMondaysInMonth(selectedMonth)}
                    passengers={state.passengers}
                    onJumpToWeek={handleJumpToWeek}
                    isPublicView={isPublicView}
                    pixKey={state.pixKey || ''}
                  />
                )
              ) : (
                <div className="flex-1 flex flex-col gap-6 w-full">
                  <RidesTable
                    startDate={state.startDate}
                    passengers={state.passengers}
                    driverStatus={state.driverStatus}
                    driverOffDays={state.driverOffDays}
                    cellStates={state.cellStates}
                    onToggleCell={handleToggleCell}
                    onCellValChange={handleCellValChange}
                    onToggleDriverStatus={handleToggleDriverStatus}
                    gasPrice={state.gasPrice}
                    carEfficiency={state.carEfficiency || 12}
                    onOpenSelectPassengersModal={() => setIsSelectWeekModalOpen(true)}
                    onRemovePassenger={handleRemovePassengerFromWeek}
                    isPublicView={isPublicView}
                    passengerMonthlyTotals={passengerMonthlyTotals}
                    activeMonthName={formattedActiveMonthName}
                    driverNotes={state.driverNotes || {}}
                    passengerNotes={state.passengerNotes || {}}
                    onUpdateDriverNote={handleUpdateDriverNote}
                    onUpdatePassengerNote={handleUpdatePassengerNote}
                  />
                  {!isPublicView && (
                    <PassengerRoutesTable
                      passengers={state.passengers}
                      gasPrice={state.gasPrice}
                      carEfficiency={state.carEfficiency || 12}
                      onUpdatePassengerRoute={handleUpdatePassengerRoute}
                    />
                  )}
                </div>
              )}

              {/* Sidebar calculations & operations */}
              <SummarySidebar
                gasPrice={activeViewMode === 'monthly' ? avgGas : state.gasPrice}
                onGasPriceChange={handleGasPriceChange}
                dailyBasicValue={activeViewMode === 'monthly' ? avgDaily : state.dailyBasicValue}
                onDailyBasicValueChange={handleDailyBasicValueChange}
                dailyConsumption={activeViewMode === 'monthly' ? avgConsumption : state.dailyConsumption}
                onDailyConsumptionChange={handleDailyConsumptionChange}
                carEfficiency={activeViewMode === 'monthly' ? avgEfficiency : state.carEfficiency || 12}
                onCarEfficiencyChange={handleCarEfficiencyChange}
                activeDaysCount={activeViewMode === 'monthly' ? monthlyActiveDays : activeDaysCount}
                totalGross={activeViewMode === 'monthly' ? monthlyGross : totalGross}
                totalNet={activeViewMode === 'monthly' ? monthlyNet : totalNet}
                onSave={handleSave}
                onReset={handleReset}
                onOpenPassengersModal={() => setIsModalOpen(true)}
                saveSuccess={saveSuccess}
                disabled={activeViewMode === 'monthly'}
                syncStatus={syncStatus}
                isPublicView={isPublicView}
                pixKey={state.pixKey || ''}
                onPixKeyChange={handlePixKeyChange}
              />
            </>
          )}
        </main>

        {/* Footer info banner */}
        <footer className="text-center text-xs text-slate-500 mt-6 pb-4">
          <p>© {new Date().getFullYear()} CaronasApp. Desenvolvido para facilitar o seu dia a dia.</p>
        </footer>

      </div>

      {/* Passenger configuration modal */}
      <PassengerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        passengers={globalPassengers}
        onSave={handleSaveGlobalPassengers}
      />

      {/* Week passenger selection modal */}
      <SelectWeekPassengersModal
        isOpen={isSelectWeekModalOpen}
        onClose={() => setIsSelectWeekModalOpen(false)}
        globalPassengers={globalPassengers}
        selectedPassengerIds={state.passengers.map(p => p.id)}
        onSave={handleSaveWeekPassengers}
      />

    </div>
  );
}
