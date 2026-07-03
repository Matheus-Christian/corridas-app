import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Fuel, Calendar, Coins, Sparkles, Upload, Loader2, Eye, X, Image as ImageIcon, Pencil } from 'lucide-react';
import Tesseract from 'tesseract.js';

export default function RefuelingsView({
  refuelings,
  startDate,
  selectedMonth,
  onAddRefueling,
  onEditRefueling,
  onDeleteRefueling,
  onSaveRefuelings,
  syncStatus
}) {
  const [date, setDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [discount, setDiscount] = useState('');
  const [station, setStation] = useState('');
  const [receiptImage, setReceiptImage] = useState(null); // base64 string
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrNotice, setOcrNotice] = useState('');
  const [activePreviewImage, setActivePreviewImage] = useState(null); // Image URL for preview modal
  const [rawOcrText, setRawOcrText] = useState('');
  const [showOcrDebug, setShowOcrDebug] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'month' | 'week'

  // Filter validations
  const isInCurrentMonth = (dateString) => {
    if (!dateString) return false;
    const refDate = new Date(dateString + 'T00:00:00');
    return (
      refDate.getFullYear() === selectedMonth.getFullYear() &&
      refDate.getMonth() === selectedMonth.getMonth()
    );
  };

  const isInCurrentWeek = (dateString) => {
    if (!dateString) return false;
    const refDate = new Date(dateString + 'T00:00:00');
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Sunday
    
    return refDate >= start && refDate <= end;
  };

  const filteredRefuelings = refuelings.filter(item => {
    if (filterMode === 'week') {
      return isInCurrentWeek(item.date);
    }
    if (filterMode === 'month') {
      return isInCurrentMonth(item.date);
    }
    return true;
  });

  const getWeekRangeLabel = (mondayISO) => {
    const start = new Date(mondayISO + 'T00:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${fmt(start)} a ${fmt(end)}`;
  };

  // Auto-calculate total value when liters, pricePerLiter, and discount change
  useEffect(() => {
    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    const d = parseFloat(discount) || 0;
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalValue((l * p - d).toFixed(2));
    }
  }, [liters, pricePerLiter, discount]);

  const fileInputRef = useRef(null);

  // Compress image to Base64 using Canvas
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 900;
          const MAX_HEIGHT = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Quality 0.6 reduces image to roughly 40KB
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Extract date, liters, total, and price using Regex
  const parseReceiptText = (text) => {
    const result = {
      date: '',
      liters: '',
      totalValue: '',
      pricePerLiter: '',
      station: ''
    };

    if (!text) return result;

    const cleanNumber = (str) => {
      if (!str) return 0;
      return parseFloat(str.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
    };

    // 1. Extract date (DD/MM/YYYY or DD/MM/YY)
    const dateRegex = /\b(\d{2})[/\-.](\d{2})[/\-.](\d{2,4})\b/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const day = dateMatch[1];
      const month = dateMatch[2];
      let year = dateMatch[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      // Ensure date is in June 2026 or later
      const parsedDate = new Date(`${year}-${month}-${day}T00:00:00`);
      const minDate = new Date('2026-06-01T00:00:00');
      if (parsedDate >= minDate) {
        result.date = `${year}-${month}-${day}`;
      }
    }

    // Split text to analyze line-by-line
    const lines = text.split('\n');
    lines.forEach(line => {
      const upperLine = line.toUpperCase();
      // Look for gas station name
      if (
        (upperLine.includes('SHELL') || 
         upperLine.includes('IPIRANGA') || 
         upperLine.includes('PETROBRAS') || 
         upperLine.includes('AUTO POSTO') || 
         upperLine.includes('POSTO') || 
         upperLine.includes('ALE') || 
         upperLine.includes('BR')) && 
        !result.station && 
        line.length > 3 && 
        line.length < 50
      ) {
        if (!upperLine.includes('CNPJ') && !upperLine.includes('AV.') && !upperLine.includes('RUA')) {
          result.station = line.trim();
        }
      }
    });

    // 2. Extract Liters
    // Pattern A: decimal number followed by L, LT, LTR, LITROS
    const litersRegex1 = /\b(\d+[.,]\d{2,3})\s*(?:L|LT|LTR|LITROS)\b/i;
    const litersMatch1 = text.match(litersRegex1);
    if (litersMatch1) {
      result.liters = String(cleanNumber(litersMatch1[1]));
    } else {
      // Pattern B: Look for any number with exactly 3 decimal places (very standard for fuel in BR, e.g. 45,123 or 32.000)
      const litersRegex2 = /\b(\d+[.,]\d{3})\b/;
      const litersMatch2 = text.match(litersRegex2);
      if (litersMatch2) {
        result.liters = String(cleanNumber(litersMatch2[1]));
      }
    }

    // 3. Extract Unit Price
    // Pattern A: Unit price labels
    const unitPriceRegex = /(?:UNIT|UNITARIO|VLR\.?\s*UN|PRECO\.?\s*UN|UN\s*R\$)\s*[:R$]*\s*(\d+[.,]\d{2,3})/i;
    const unitPriceMatch = text.match(unitPriceRegex);
    if (unitPriceMatch) {
      result.pricePerLiter = String(cleanNumber(unitPriceMatch[1]));
    } else {
      // Pattern B: Look for a value that matches typical fuel prices in BR (e.g. 5,00 to 9,99)
      const priceRegex = /\b([4-9][.,]\d{2,3})\b/;
      const priceMatch = text.match(priceRegex);
      if (priceMatch) {
        result.pricePerLiter = String(cleanNumber(priceMatch[1]));
      }
    }

    // 4. Extract Total Value
    // Pattern A: Total labels
    const totalValueRegex = /(?:TOTAL|PAGAR|VLR\.?\s*TOTAL|VALOR\.?\s*TOTAL|LIQUIDO|VAL\.?\s*RECEBIDO|VLR\s*PAGO)\s*[:R$]*\s*(\d+[.,]\d{2})\b/i;
    const totalValueMatch = text.match(totalValueRegex);
    if (totalValueMatch) {
      result.totalValue = String(cleanNumber(totalValueMatch[1]));
    }

    // Pattern B: Look for largest value near bottom (fall back)
    if (!result.totalValue) {
      const monetaryRegex = /\b\d+[.,]\d{2}\b/g;
      const allMatches = text.match(monetaryRegex);
      if (allMatches) {
        const values = allMatches.map(cleanNumber);
        const filteredValues = values.filter(v => v > 15 && v < 1200);
        if (filteredValues.length > 0) {
          result.totalValue = String(Math.max(...filteredValues));
        }
      }
    }

    // Fallbacks to compute missing fields
    if (result.totalValue && result.liters && !result.pricePerLiter) {
      const computedPrice = parseFloat(result.totalValue) / parseFloat(result.liters);
      result.pricePerLiter = computedPrice.toFixed(2);
    }
    if (result.totalValue && result.pricePerLiter && !result.liters) {
      const computedLiters = parseFloat(result.totalValue) / parseFloat(result.pricePerLiter);
      result.liters = computedLiters.toFixed(3);
    }
    if (result.liters && result.pricePerLiter && !result.totalValue) {
      const computedTotal = parseFloat(result.liters) * parseFloat(result.pricePerLiter);
      result.totalValue = computedTotal.toFixed(2);
    }

    return result;
  };

  // Handle Receipt Upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrNotice('');
    setOcrStatus('Lendo e comprimindo imagem...');
    setRawOcrText('');

    try {
      // 1. Compress
      const compressedBase64 = await compressImage(file);
      setReceiptImage(compressedBase64);

      // 2. Perform OCR
      setOcrStatus('Carregando OCR (português)...');
      const result = await Tesseract.recognize(compressedBase64, 'por', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrStatus(`Escaneando cupom: ${Math.round(m.progress * 100)}%`);
          } else {
            setOcrStatus(`Status: ${m.status}`);
          }
        }
      });

      const text = result.data.text;
      setRawOcrText(text);

      // 3. Parse fields
      setOcrStatus('Processando informações...');
      const parsed = parseReceiptText(text);

      const detectedFields = [];
      if (parsed.date) {
        setDate(parsed.date);
        detectedFields.push('Data');
      }
      if (parsed.station) {
        setStation(parsed.station);
        detectedFields.push('Posto');
      }
      if (parsed.liters) {
        setLiters(parsed.liters);
        detectedFields.push('Litros');
      }
      if (parsed.pricePerLiter) {
        setPricePerLiter(parsed.pricePerLiter);
        detectedFields.push('Preço/L');
      }
      if (parsed.totalValue) {
        setTotalValue(parsed.totalValue);
        detectedFields.push('Valor Total');
      }

      if (detectedFields.length > 0) {
        setOcrNotice(`Leitura concluída! Detectamos: ${detectedFields.join(', ')}. Por favor, revise os dados.`);
      } else {
        setOcrNotice('Leitura concluída, mas nenhum dado foi identificado automaticamente. Veja o texto lido abaixo ou insira manualmente.');
      }
    } catch (err) {
      console.error("Erro no OCR:", err);
      setOcrNotice('Não foi possível ler a imagem automaticamente. Digite os dados manualmente.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setDate(item.date);
    setLiters(String(item.liters));
    setPricePerLiter(String(item.pricePerLiter));
    setTotalValue(String(item.totalValue));
    setDiscount(item.discount ? String(item.discount) : '');
    setStation(item.station || '');
    setReceiptImage(item.receiptImage || null);
    setRawOcrText('');
    setOcrNotice('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
    setLiters('');
    setPricePerLiter('');
    setTotalValue('');
    setDiscount('');
    setStation('');
    setReceiptImage(null);
    setRawOcrText('');
    setOcrNotice('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Form
  const handleSubmit = (e) => {
    e.preventDefault();

    const parsedLiters = parseFloat(liters);
    const parsedPrice = parseFloat(pricePerLiter);
    const parsedTotal = parseFloat(totalValue);

    if (!date || isNaN(parsedLiters) || isNaN(parsedTotal)) {
      alert("Por favor, preencha pelo menos a Data, Litros e Valor Total.");
      return;
    }

    // Force date check to not allow retroactives
    if (new Date(date + 'T00:00:00') < new Date('2026-06-01T00:00:00')) {
      alert("A data do abastecimento não pode ser retroativa a Junho de 2026.");
      return;
    }

    const calculatedPrice = isNaN(parsedPrice) 
      ? parseFloat((parsedTotal / parsedLiters).toFixed(2)) 
      : parsedPrice;
    
    const parsedDiscount = parseFloat(discount) || 0;

    if (editingId) {
      const updatedRecord = {
        id: editingId,
        date,
        liters: parsedLiters,
        pricePerLiter: calculatedPrice,
        totalValue: parsedTotal,
        discount: parsedDiscount,
        station: station.trim() || 'Posto Desconhecido',
        receiptImage
      };
      onEditRefueling(updatedRecord);
      setEditingId(null);
    } else {
      const newRecord = {
        id: String(Date.now()),
        date,
        liters: parsedLiters,
        pricePerLiter: calculatedPrice,
        totalValue: parsedTotal,
        discount: parsedDiscount,
        station: station.trim() || 'Posto Desconhecido',
        receiptImage // saves compressed base64
      };
      onAddRefueling(newRecord);
    }

    // Reset Form
    setLiters('');
    setPricePerLiter('');
    setTotalValue('');
    setDiscount('');
    setStation('');
    setReceiptImage(null);
    setOcrNotice('');
    setRawOcrText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculations
  const totalSpent = filteredRefuelings.reduce((sum, r) => sum + r.totalValue, 0);
  const totalLiters = filteredRefuelings.reduce((sum, r) => sum + r.liters, 0);
  const averagePrice = totalLiters > 0 ? (totalSpent / totalLiters) : 0;
  const totalDiscount = filteredRefuelings.reduce((sum, r) => sum + (r.discount || 0), 0);

  const formatCurrency = (val) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDate = (isoString) => {
    const parts = isoString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoString;
  };

  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* 1. Metric Cards Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Spent Total */}
        <div className="relative overflow-hidden rounded-3xl glass-panel p-6 shadow-xl border border-indigo-500/20 bg-gradient-to-br from-slate-900/60 to-indigo-950/20">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Total Gasto em Combustível</span>
          <h3 className="text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
            {formatCurrency(totalSpent)}
          </h3>
          <p className="text-xs text-slate-400 mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-indigo-400" />
              <span>Soma de todos os abastecimentos</span>
            </span>
            {totalDiscount > 0 && (
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                Economia de {formatCurrency(totalDiscount)}
              </span>
            )}
          </p>
        </div>

        {/* Liters Total */}
        <div className="relative overflow-hidden rounded-3xl glass-panel p-6 shadow-xl border border-blue-500/20 bg-gradient-to-br from-slate-900/60 to-blue-950/20">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Volume Total Adquirido</span>
          <h3 className="text-3xl font-extrabold text-slate-100 tracking-tight mt-1">
            {totalLiters.toFixed(2)} <span className="text-sm font-medium text-slate-400">L</span>
          </h3>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Fuel className="w-3.5 h-3.5 text-blue-400" />
            <span>Volume acumulado abastecido</span>
          </p>
        </div>

        {/* Average Price */}
        <div className="relative overflow-hidden rounded-3xl glass-panel p-6 shadow-xl border border-emerald-500/20 bg-gradient-to-br from-slate-900/60 to-emerald-950/20 sidebar-net-card glow-green">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Preço Médio Ponderado</span>
          <h3 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            {formatCurrency(averagePrice)} <span className="text-sm font-medium text-slate-400">/ L</span>
          </h3>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Média de valor por litro</span>
          </p>
        </div>
      </div>

      {/* 2. Refuelings Management Area */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* List Table (Left) */}
        <div className="glass-panel rounded-3xl p-6 shadow-xl border border-white/10 flex-1 flex flex-col w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 mb-4 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Fuel className="w-5 h-5 text-indigo-400" />
                Histórico de Abastecimentos
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Visualização e gestão dos cupons fiscais e litros adquiridos.
              </p>
              {filterMode === 'month' && (
                <span className="inline-block mt-2 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/25">
                  Filtro: {selectedMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
              )}
              {filterMode === 'week' && (
                <span className="inline-block mt-2 text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/25">
                  Filtro: Semana {getWeekRangeLabel(startDate)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Pills */}
              <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/5 text-[10px] font-bold tracking-wider">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('month')}
                  className={`px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer ${
                    filterMode === 'month'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mês
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('week')}
                  className={`px-3 py-1.5 rounded-lg transition duration-200 cursor-pointer ${
                    filterMode === 'week'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semana
                </button>
              </div>

              {onSaveRefuelings && (
                <button
                  type="button"
                  onClick={onSaveRefuelings}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                >
                  Salvar Histórico
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-400 text-xs border-b border-white/5 w-28">Data</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-400 text-xs border-b border-white/5">Posto</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400 text-xs border-b border-white/5 w-24">Litros</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400 text-xs border-b border-white/5 w-28">Preço/Litro</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400 text-xs border-b border-white/5 w-28">Desconto</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-400 text-xs border-b border-white/5 w-28">Valor Total</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-400 text-xs border-b border-white/5 w-20">Cupom</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-400 text-xs border-b border-white/5 w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRefuelings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-sm">
                      Nenhum abastecimento encontrado para o filtro ativo.
                    </td>
                  </tr>
                ) : (
                  filteredRefuelings
                    .slice()
                    .sort((a, b) => new Date(b.date) - new Date(a.date)) // newest first
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 border-b border-white/5 text-sm text-slate-300 font-medium">
                          {formatDate(item.date)}
                        </td>
                        <td className="py-3 px-4 border-b border-white/5 text-sm text-slate-100 font-semibold">
                          {item.station}
                        </td>
                        <td className="py-3 px-4 border-b border-white/5 text-sm text-slate-300 text-right font-medium">
                          {item.liters.toFixed(2)} L
                        </td>
                        <td className="py-3 px-4 border-b border-white/5 text-sm text-slate-300 text-right font-medium">
                          {formatCurrency(item.pricePerLiter)}
                        </td>
                        <td className="py-3 px-4 border-b border-white/5 text-sm text-amber-500 text-right font-semibold">
                          {item.discount && item.discount > 0 ? formatCurrency(item.discount) : '-'}
                        </td>
                        <td className="py-3 px-4 border-b border-white/5 text-sm text-emerald-400 text-right font-bold">
                          {formatCurrency(item.totalValue)}
                        </td>
                        <td className="py-3 px-4 border-b border-white/5 text-center">
                          {item.receiptImage ? (
                            <button
                              onClick={() => setActivePreviewImage(item.receiptImage)}
                              className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition"
                              title="Visualizar cupom fiscal"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 border-b border-white/5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition"
                              title="Editar registro"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteRefueling(item.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                              title="Excluir registro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Form Panel (Right) */}
        <div className="glass-panel rounded-3xl p-6 shadow-xl border border-white/10 w-full lg:w-80 shrink-0 flex flex-col gap-4">
          <h3 className="text-md font-bold text-slate-200 flex items-center gap-2 border-b border-white/5 pb-3">
            {editingId ? (
              <>
                <Pencil className="w-4 h-4 text-amber-400" />
                <span>Editar Abastecimento</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Registrar Abastecimento</span>
              </>
            )}
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Nota Fiscal Photo Selector / Scan */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-400 block">
                Foto do Cupom Fiscal (Auto-OCR)
              </label>
              
              <div 
                onClick={() => !ocrLoading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition cursor-pointer text-center ${
                  ocrLoading 
                    ? 'border-indigo-500/50 bg-indigo-500/5 text-indigo-300' 
                    : receiptImage
                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-slate-300'
                }`}
              >
                {ocrLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    <span className="text-xs font-semibold animate-pulse">{ocrStatus}</span>
                  </>
                ) : receiptImage ? (
                  <>
                    <div className="relative group">
                      <img 
                        src={receiptImage} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded-xl border border-emerald-500/20"
                      />
                      <div className="absolute inset-0 bg-slate-950/70 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <ImageIcon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 font-medium">Cupom carregado. Clique para trocar.</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-500" />
                    <span className="text-xs font-semibold">Fazer upload ou tirar foto</span>
                    <span className="text-[9px] text-slate-500">Auto-preencher via IA/OCR</span>
                  </>
                )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
                disabled={ocrLoading}
              />

              {ocrNotice && (
                <div className={`text-[10px] p-2 rounded-lg font-medium leading-tight ${
                  ocrNotice.includes('concluída') && !ocrNotice.includes('nenhum dado')
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                }`}>
                  {ocrNotice}
                </div>
              )}

              {/* Show OCR raw text debug option */}
              {rawOcrText && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => setShowOcrDebug(!showOcrDebug)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                  >
                    {showOcrDebug ? 'Esconder texto lido' : 'Visualizar texto lido'}
                  </button>
                  {showOcrDebug && (
                    <div className="mt-2 p-2 bg-slate-950/80 border border-white/5 rounded-xl max-h-40 overflow-y-auto text-[9px] font-mono text-slate-300 whitespace-pre-wrap">
                      {rawOcrText}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date Field */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Data do Abastecimento
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  type="date"
                  required
                  min="2026-06-01"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Station (Posto) Field */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Posto de Combustível
              </label>
              <input
                type="text"
                placeholder="Ex: Posto Shell Portal"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Liters Field */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Quantidade de Litros (L)
              </label>
              <input
                type="number"
                step="0.001"
                required
                placeholder="Ex: 45.30"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Price Per Liter Field */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Preço por Litro (R$)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 text-xs">R$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Calculado se vazio"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Discount Field */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Desconto (R$)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 text-xs">R$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 10.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Total Value Field */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Valor Total Pago (R$)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 text-xs">R$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 271.35"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  className="block w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={ocrLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white font-semibold text-sm transition duration-200 mt-2 ${
                editingId 
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/10 hover:shadow-amber-600/25'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25'
              } disabled:bg-slate-800 disabled:cursor-not-allowed`}
            >
              {editingId ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Abastecimento</span>
                </>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700/50 transition duration-200"
              >
                Cancelar Edição
              </button>
            )}
          </form>
        </div>

      </div>

      {/* 3. Cupom Lightbox Modal */}
      {activePreviewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-350">
          <div className="relative max-w-xl w-full bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/40">
              <h3 className="text-sm font-bold text-slate-200">Foto do Cupom Fiscal</h3>
              <button 
                onClick={() => setActivePreviewImage(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 flex justify-center items-center bg-slate-950/20 max-h-[70vh] overflow-y-auto">
              <img 
                src={activePreviewImage} 
                alt="Cupom Fiscal Ampliado" 
                className="max-w-full h-auto rounded-xl shadow-lg border border-white/5 max-h-[60vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
