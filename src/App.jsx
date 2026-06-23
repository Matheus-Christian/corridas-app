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
import PassengerRoutesTable from './components/PassengerRoutesTable';
import { CarFront, Cloud, CloudOff, CalendarDays, CalendarRange, Fuel, Sun, Moon } from 'lucide-react';
import { db } from './firebase';
import { doc, onSnapshot, setDoc, getDocs, collection, query, orderBy, limit, getDoc } from 'firebase/firestore';

export default function App() {
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
  const [monthlyWeeksData, setMonthlyWeeksData] = useState({});
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectWeekModalOpen, setIsSelectWeekModalOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
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

          if (!querySnap.empty) {
            const latestDoc = querySnap.docs[0].data();
            gasPriceToUse = latestDoc.gasPrice ?? state.gasPrice;
            dailyBasicToUse = latestDoc.dailyBasicValue ?? state.dailyBasicValue;
            dailyConsumptionToUse = latestDoc.dailyConsumption ?? state.dailyConsumption;
            carEfficiencyToUse = latestDoc.carEfficiency ?? (state.carEfficiency || 12);
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

  // 4. Batch load all weeks for the selected month (triggers when viewMode changes or selectedMonth shifts)
  useEffect(() => {
    if (viewMode !== 'monthly') return;

    const fetchMonthlyData = async () => {
      setIsMonthlyLoading(true);
      const mondays = getMondaysInMonth(selectedMonth);
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
  }, [viewMode, selectedMonth, state.startDate, state, db]);

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

  // Cell status toggling (Cycles: neutral -> present -> off -> neutral)
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
    
    setState(prev => ({
      ...prev,
      cellStates: {
        ...prev.cellStates,
        [passengerId]: {
          ...prev.cellStates[passengerId],
          [dayIdx]: {
            status: 'present',
            value: parsedVal
          }
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

  const handleStartDateChange = (newDate) => {
    if (new Date(newDate + 'T00:00:00') < new Date('2026-06-01T00:00:00')) {
      newDate = '2026-06-01';
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
  const handleJumpToWeek = (mondayISO) => {
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
        if (cellObj.status === 'present') {
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
          if (cellObj.status === 'present') {
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
  const { avgGas, avgDaily, avgConsumption, avgEfficiency } = getMonthlyAverages();

  return (
    <div className="relative min-h-screen w-full px-4 py-8 md:px-8 overflow-hidden">
      
      {/* Decorative Blur Spheres (Background) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] animate-float-slow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px] animate-float-delayed pointer-events-none" />

      {/* Main Container */}
      <div className="relative max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Header App Title */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25">
              <CarFront className="w-7 h-7 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-50 to-slate-200">
                Caronas da Semana
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                Gestão simplificada e rateio inteligente de corridas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Segmented Control */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setViewMode('weekly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition duration-200 flex items-center gap-1 ${
                  viewMode === 'weekly'
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
                  viewMode === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Mensal
              </button>
              <button
                onClick={() => setViewMode('refuelings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition duration-200 flex items-center gap-1 ${
                  viewMode === 'refuelings'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Fuel className="w-3.5 h-3.5" />
                Abastecimentos
              </button>
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
          </div>
        </header>

        {/* Date Selector depending on View Mode */}
        {viewMode === 'monthly' ? (
          <MonthlySelector 
            selectedMonth={selectedMonth}
            onChangeMonth={handleMonthChange}
          />
        ) : viewMode === 'weekly' ? (
          <DateSelector 
            startDate={state.startDate}
            onChangeStartDate={handleStartDateChange}
          />
        ) : null}

        {/* Core Layout Grid */}
        <main className="flex flex-col lg:flex-row gap-6 items-start">
          {viewMode === 'refuelings' ? (
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
              {viewMode === 'monthly' ? (
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
                  />
                )
              ) : (
                <div className="flex-1 flex flex-col gap-6">
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
                  />
                  <PassengerRoutesTable
                    passengers={state.passengers}
                    gasPrice={state.gasPrice}
                    carEfficiency={state.carEfficiency || 12}
                    onUpdatePassengerRoute={handleUpdatePassengerRoute}
                  />
                </div>
              )}

              {/* Sidebar calculations & operations */}
              <SummarySidebar
                gasPrice={viewMode === 'monthly' ? avgGas : state.gasPrice}
                onGasPriceChange={handleGasPriceChange}
                dailyBasicValue={viewMode === 'monthly' ? avgDaily : state.dailyBasicValue}
                onDailyBasicValueChange={handleDailyBasicValueChange}
                dailyConsumption={viewMode === 'monthly' ? avgConsumption : state.dailyConsumption}
                onDailyConsumptionChange={handleDailyConsumptionChange}
                carEfficiency={viewMode === 'monthly' ? avgEfficiency : state.carEfficiency || 12}
                onCarEfficiencyChange={handleCarEfficiencyChange}
                activeDaysCount={viewMode === 'monthly' ? monthlyActiveDays : activeDaysCount}
                totalGross={viewMode === 'monthly' ? monthlyGross : totalGross}
                totalNet={viewMode === 'monthly' ? monthlyNet : totalNet}
                onSave={handleSave}
                onReset={handleReset}
                onOpenPassengersModal={() => setIsModalOpen(true)}
                saveSuccess={saveSuccess}
                disabled={viewMode === 'monthly'}
                syncStatus={syncStatus}
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
