// Helper to handle local storage load and save operations

export const DEFAULT_PASSENGERS = [
  { id: '1', name: 'Fernando', defaultRate: 8.00 },
  { id: '2', name: 'Gustavo', defaultRate: 8.00 },
  { id: '3', name: 'Leo Finger', defaultRate: 8.00 },
  { id: '4', name: 'Matheus', defaultRate: 8.00 },
];

export const STORAGE_KEY = 'caronas_semanais_data';

// Helper to get the current week's Monday date
export const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Formats a date to YYYY-MM-DD in local time
export const formatDateISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getInitialData = () => {
  const today = new Date();
  const monday = getMonday(today);
  
  // Set default cells
  const initialCells = {};
  DEFAULT_PASSENGERS.forEach(p => {
    initialCells[p.id] = {};
    for (let day = 0; day < 7; day++) {
      initialCells[p.id][day] = { status: 'neutral', value: 0 }; // Neutral by default
    }
  });

  const initialDriverStatus = {
    0: 'neutral', // Seg
    1: 'neutral', // Ter
    2: 'neutral', // Qua
    3: 'neutral', // Qui
    4: 'neutral', // Sex
    5: 'neutral', // Sáb
    6: 'neutral', // Dom
  };

  const initialDriverOff = {
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false
  };

  return {
    passengers: DEFAULT_PASSENGERS,
    gasPrice: 5.99,
    carEfficiency: 12.0,
    dailyBasicValue: 21.00,
    dailyConsumption: 3.5, // 3.5 liters per day
    startDate: formatDateISO(monday),
    driverStatus: initialDriverStatus,
    driverOffDays: initialDriverOff,
    cellStates: initialCells,
  };
};

export const getPassengerRate = (passenger, carEfficiency, gasPrice) => {
  const eff = parseFloat(carEfficiency) || 12;
  const price = parseFloat(gasPrice) || 0;
  if (eff <= 0 || price <= 0) {
    return passenger.defaultRate || 0;
  }
  
  const idaKm = parseFloat(passenger.route?.ida?.km) || 0;
  const voltaKm = parseFloat(passenger.route?.volta?.km) || 0;
  
  if (idaKm === 0 && voltaKm === 0) {
    return passenger.defaultRate || 0;
  }
  
  const totalKm = idaKm + voltaKm;
  const totalLiters = totalKm / eff;
  return totalLiters * price;
};

export const getDriverStatus = (dayIdx, driverStatus, driverOffDays) => {
  if (driverStatus && driverStatus[dayIdx] !== undefined) {
    return driverStatus[dayIdx];
  }
  if (driverOffDays && driverOffDays[dayIdx] !== undefined) {
    return driverOffDays[dayIdx] ? 'off' : 'active';
  }
  return 'neutral';
};

export const loadData = (targetDate = null) => {
  try {
    const key = targetDate ? `${STORAGE_KEY}_${targetDate}` : STORAGE_KEY;
    let data = localStorage.getItem(key);
    
    // Fallback to main key if date key not found
    if (!data && targetDate) {
      data = localStorage.getItem(STORAGE_KEY);
    }
    
    if (!data) return getInitialData();
    const parsed = JSON.parse(data);
    
    // Ensure structure safety
    return {
      ...getInitialData(),
      ...parsed,
    };
  } catch (error) {
    console.error('Error loading data from local storage', error);
    return getInitialData();
  }
};

export const saveData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (data.startDate) {
      localStorage.setItem(`${STORAGE_KEY}_${data.startDate}`, JSON.stringify(data));
    }
    return true;
  } catch (error) {
    console.error('Error saving data to local storage', error);
    return false;
  }
};

