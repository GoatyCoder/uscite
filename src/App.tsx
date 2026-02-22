/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  Download, 
  Settings, 
  Building2, 
  RefreshCw,
  LayoutDashboard,
  Home,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  History,
  Layers,
  Weight as WeightIcon,
  Tag,
  Truck,
  Edit
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import bwipjs from 'bwip-js';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  MasterArticle, 
  MasterPackaging, 
  MasterPallet, 
  MasterRecipient, 
  PalletLine, 
  PalletHistory, 
  MasterDDT, 
  ViewMode 
} from './types';
import { Sidebar } from './components/Sidebar';
import { ArticlesPage } from './pages/ArticlesPage';
import { PackagingsPage } from './pages/PackagingsPage';
import { PalletsPage } from './pages/PalletsPage';
import { PalletCompositionPage } from './pages/PalletCompositionPage';
import { RecipientsPage } from './pages/RecipientsPage';
import { Button } from './components/ui/Button';

/**
 * Utility per gestire le classi Tailwind
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- LOGICA GS1 ---

/**
 * Calcola il Check Digit (Modulo 10) per un codice GS1.
 * Utilizzato per SSCC-18, GTIN-13, ecc.
 */
const calculateCheckDigit = (code: string): number => {
  let sum = 0;
  const reversed = code.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    const digit = parseInt(reversed[i]);
    if (i % 2 === 0) {
      sum += digit * 3;
    } else {
      sum += digit;
    }
  }
  const nextTen = Math.ceil(sum / 10) * 10;
  return nextTen - sum;
};

/**
 * Formatta il peso per l'AI 3102 (Net weight in kg, 2 decimali)
 * Esempio: 120.50 -> 012050 (6 cifre)
 */
const formatWeightAI = (weight: string): string => {
  const num = parseFloat(weight.replace(',', '.'));
  if (isNaN(num)) return '000000';
  const value = Math.round(num * 100);
  return value.toString().padStart(6, '0');
};

/**
 * Formatta la data per GS1 (YYMMDD)
 */
const formatDateGS1 = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

/**
 * Formatta la data di raccolta (YYYYMMDD) per AI 7007
 */
const formatHarvestDateGS1 = (dateStr: string): string => {
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '');
};

// --- COMPONENTE PRINCIPALE ---

export default function App() {
  // View State
  const [view, setView] = useState<ViewMode>('DASHBOARD');

  // Master Data State (Persisted)
  const [articles, setArticles] = useState<MasterArticle[]>(() => {
    const saved = localStorage.getItem('gs1_articles');
    return saved ? JSON.parse(saved) : [
      { code: 'ART01', description: 'Mele Gala 75/80', gtin: '8012345000012', origin: '380', um: 'KG', unitWeight: '0', weightType: 'VARIABLE', defaultPackagingId: 'PACK01' },
      { code: 'ART02', description: 'Pere Abate 14/16', gtin: '8012345000029', origin: '380', um: 'KG', unitWeight: '15', weightType: 'FIXED', defaultPackagingId: 'PACK02' }
    ];
  });

  const [packagings, setPackagings] = useState<MasterPackaging[]>(() => {
    const saved = localStorage.getItem('gs1_packagings');
    return saved ? JSON.parse(saved) : [
      { id: 'PACK01', name: 'Cartone 40x60', tare: '0.6', isPooling: false },
      { id: 'PACK02', name: 'Cassa Legno', tare: '1.5', isPooling: false },
      { id: 'PACK03', name: 'CPR 40x60', tare: '1.2', isPooling: true },
      { id: 'PACK04', name: 'IFCO 40x60', tare: '1.1', isPooling: true }
    ];
  });

  const [palletMasters, setPalletMasters] = useState<MasterPallet[]>(() => {
    const saved = localStorage.getItem('gs1_pallets');
    return saved ? JSON.parse(saved) : [
      { id: 'PAL01', name: 'EPAL (80x120)', tare: '25', isPooling: true },
      { id: 'PAL02', name: 'Philips (100x120)', tare: '30', isPooling: true },
      { id: 'PAL03', name: 'Mezza Pedana (60x80)', tare: '12', isPooling: false },
      { id: 'PAL04', name: 'Plastica (80x120)', tare: '15', isPooling: false }
    ];
  });

  const [recipients, setRecipients] = useState<MasterRecipient[]>(() => {
    const saved = localStorage.getItem('gs1_recipients');
    return saved ? JSON.parse(saved) : [
      { code: 'CL01', name: 'GDO Logistica Nord', address: 'Interporto Blocco A, 20100 Milano (MI)' }
    ];
  });

  const [history, setHistory] = useState<PalletHistory[]>(() => {
    const saved = localStorage.getItem('gs1_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [ddts, setDdts] = useState<MasterDDT[]>(() => {
    const saved = localStorage.getItem('gs1_ddts');
    return saved ? JSON.parse(saved) : [];
  });

  // Configurazione Aziendale
  const [companyPrefix, setCompanyPrefix] = useState(() => localStorage.getItem('gs1_prefix') || '8012345');
  const [serialNumber, setSerialNumber] = useState(() => parseInt(localStorage.getItem('gs1_serial') || '1'));
  const [senderName, setSenderName] = useState(() => localStorage.getItem('gs1_sender_name') || 'Azienda Agricola Rossi');
  const [senderAddress, setSenderAddress] = useState(() => localStorage.getItem('gs1_sender_address') || 'Via delle Vigne 12, 00100 Roma (RM)');
  const [senderVat, setSenderVat] = useState(() => localStorage.getItem('gs1_sender_vat') || '01234567890');
  const [senderPhone, setSenderPhone] = useState(() => localStorage.getItem('gs1_sender_phone') || '+39 080 1234567');
  const [senderEmail, setSenderEmail] = useState(() => localStorage.getItem('gs1_sender_email') || 'info@aziendaagricola.it');

  // Sessione Pallet Corrente - REMOVED (Managed in PalletCompositionPage)
  // const [lines, setLines] = useState<PalletLine[]>([...]);

  // Sessione DDT Corrente
  const [selectedRecipientCode, setSelectedRecipientCode] = useState('');
  const [currentDdtNumber, setCurrentDdtNumber] = useState('');
  const [currentDdtDate, setCurrentDdtDate] = useState(new Date().toISOString().split('T')[0]);
  const [carrierName, setCarrierName] = useState('Vettore Proprio');
  const [carrierAddress, setCarrierAddress] = useState('');
  const [transportReason, setTransportReason] = useState('Vendita');
  const [goodsAppearance, setGoodsAppearance] = useState('Colli su Pedane');
  const [port, setPort] = useState('Franco');
  const [licensePlate, setLicensePlate] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [transportStartDateTime, setTransportStartDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [selectedPalletIds, setSelectedPalletIds] = useState<string[]>([]);

  // Editing State
  const [editingPallet, setEditingPallet] = useState<PalletHistory | null>(null);
  const [editingDdt, setEditingDdt] = useState<MasterDDT | null>(null);

  // Auto-generate DDT Number
  useEffect(() => {
    if (view === 'DDT') {
      const currentYear = new Date().getFullYear();
      // Find max number for current year
      const maxNum = ddts
        .filter(d => d.date.startsWith(currentYear.toString()))
        .reduce((max, d) => {
          const num = parseInt(d.number.split('/')[0]);
          return num > max ? num : max;
        }, 0);
      
      setCurrentDdtNumber(`${(maxNum + 1).toString().padStart(3, '0')}/${currentYear}`);
    }
  }, [view, ddts]);

  // Filtri e Ricerca
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizzazione localStorage
  useEffect(() => {
    localStorage.setItem('gs1_prefix', companyPrefix);
    localStorage.setItem('gs1_serial', serialNumber.toString());
    localStorage.setItem('gs1_articles', JSON.stringify(articles));
    localStorage.setItem('gs1_packagings', JSON.stringify(packagings));
    localStorage.setItem('gs1_pallets', JSON.stringify(palletMasters));
    localStorage.setItem('gs1_recipients', JSON.stringify(recipients));
    localStorage.setItem('gs1_history', JSON.stringify(history));
    localStorage.setItem('gs1_ddts', JSON.stringify(ddts));
    localStorage.setItem('gs1_sender_name', senderName);
    localStorage.setItem('gs1_sender_address', senderAddress);
    localStorage.setItem('gs1_sender_vat', senderVat);
    localStorage.setItem('gs1_sender_phone', senderPhone);
    localStorage.setItem('gs1_sender_email', senderEmail);
  }, [companyPrefix, serialNumber, articles, recipients, history, ddts, senderName, senderAddress, senderVat, senderPhone, senderEmail]);

  // Calcolo SSCC corrente
  const currentSSCC = useMemo(() => {
    if (!companyPrefix) return 'Manca Prefisso';
    const extension = '0';
    const base = extension + companyPrefix + serialNumber.toString().padStart(16 - companyPrefix.length, '0');
    const checkDigit = calculateCheckDigit(base);
    return base + checkDigit;
  }, [companyPrefix, serialNumber]);

  const saveToHistory = (sscc: string, lines: PalletLine[], recipientCode: string, totals: { net: string, gross: string, tare: string }, id?: string) => {
    if (id) {
      // Update existing
      setHistory(history.map(h => h.id === id ? {
        ...h,
        sscc,
        recipientCode,
        lines: [...lines],
        totalNetWeight: totals.net,
        totalGrossWeight: totals.gross,
        totalTare: totals.tare
      } : h));
      setEditingPallet(null);
      setView('STORICO');
    } else {
      // Create new
      const newEntry: PalletHistory = {
        id: crypto.randomUUID(),
        sscc,
        recipientCode,
        date: new Date().toLocaleString(),
        lines: [...lines],
        totalNetWeight: totals.net,
        totalGrossWeight: totals.gross,
        totalTare: totals.tare
      };
      setHistory([newEntry, ...history]);
    }
  };

  const deletePallet = (id: string) => {
    const pallet = history.find(p => p.id === id);
    if (pallet?.ddtId) {
      alert('Impossibile eliminare una pedana già associata a un DDT. Elimina prima il DDT.');
      return;
    }
    if (confirm('Sei sicuro di voler eliminare questa pedana dallo storico?')) {
      setHistory(history.filter(p => p.id !== id));
    }
  };

  const deleteDdt = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo DDT? Le pedane associate torneranno disponibili.')) {
      setDdts(ddts.filter(d => d.id !== id));
      setHistory(history.map(p => p.ddtId === id ? { ...p, ddtId: undefined } : p));
    }
  };

  const startEditDdt = (ddt: MasterDDT) => {
    setEditingDdt(ddt);
    setSelectedRecipientCode(ddt.recipientCode);
    setCurrentDdtNumber(ddt.number);
    setCurrentDdtDate(ddt.date);
    setCarrierName(ddt.carrierName);
    setCarrierAddress(ddt.carrierAddress || '');
    setTransportReason(ddt.transportReason);
    setGoodsAppearance(ddt.goodsAppearance);
    setPort(ddt.port);
    setLicensePlate(ddt.licensePlate || '');
    setTrailerPlate(ddt.trailerPlate || '');
    setTransportStartDateTime(ddt.transportStartDateTime);
    setSelectedPalletIds(ddt.palletIds || []);
    setView('DDT');
  };

  const createDDT = () => {
    if (!selectedRecipientCode || !currentDdtNumber || selectedPalletIds.length === 0) {
      alert('Compila tutti i campi e seleziona almeno una pedana');
      return;
    }

    const ddtId = editingDdt ? editingDdt.id : crypto.randomUUID();
    const newDdt: MasterDDT = {
      id: ddtId,
      number: currentDdtNumber,
      date: currentDdtDate,
      recipientCode: selectedRecipientCode,
      palletIds: [...selectedPalletIds],
      carrierName,
      carrierAddress,
      transportReason,
      goodsAppearance,
      transportStartDateTime,
      port,
      licensePlate,
      trailerPlate,
      palletCount: selectedPalletIds.length
    };

    if (editingDdt) {
      setDdts(ddts.map(d => d.id === ddtId ? newDdt : d));
      // Reset previous pallets ddtId
      setHistory(history.map(p => {
        if (p.ddtId === ddtId) return { ...p, ddtId: undefined };
        return p;
      }).map(p => {
        if (selectedPalletIds.includes(p.id)) return { ...p, ddtId };
        return p;
      }));
      setEditingDdt(null);
    } else {
      setDdts([newDdt, ...ddts]);
      // Aggiorna la storia delle pedane con il riferimento al DDT
      setHistory(history.map(p => 
        selectedPalletIds.includes(p.id) ? { ...p, ddtId } : p
      ));
    }

    // Reset sessione DDT
    setCurrentDdtNumber('');
    setSelectedPalletIds([]);
    alert(`DDT ${currentDdtNumber} ${editingDdt ? 'aggiornato' : 'creato'} con successo!`);
    
    generateDdtPDF(newDdt);
  };

  const generateDdtPDF = (ddt: MasterDDT) => {
    const recipient = recipients.find(r => r.code === ddt.recipientCode);
    if (!recipient) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 12;
    const width = 210;
    const colWidth = (width - 2 * margin);

    // --- LOGO E INTESTAZIONE MITTENTE ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(senderName.toUpperCase(), margin, margin + 5);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(senderAddress, margin, margin + 10);
    doc.text(`P.IVA / C.F. ${senderVat} - Tel. ${senderPhone}`, margin, margin + 13);
    doc.text(`${senderEmail}`, margin, margin + 16);

    // --- TITOLO DOCUMENTO ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('DOCUMENTO DI TRASPORTO (D.D.T.)', margin, margin + 28);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Valido ai sensi del D.P.R. 472 del 14/08/1996', margin, margin + 32);

    // Box Numero e Data
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin + 130, margin + 22, 55, 12);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DDT N.', margin + 132, margin + 27);
    doc.text('DEL', margin + 160, margin + 27);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(ddt.number, margin + 132, margin + 32);
    doc.text(ddt.date, margin + 160, margin + 32);

    // --- DESTINATARIO ---
    let currentY = margin + 45;
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(250, 250, 250);
    doc.rect(width / 2, currentY - 5, (width / 2) - margin, 25, 'FD');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DESTINATARIO:', (width / 2) + 2, currentY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(recipient.name, (width / 2) + 2, currentY + 6);
    doc.setFontSize(8);
    doc.text(recipient.address, (width / 2) + 2, currentY + 11);
    doc.text(`Cod. Cliente: ${recipient.code}`, (width / 2) + 2, currentY + 16);

    currentY += 30;

    // --- TABELLA PRODOTTI ---
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY - 4, colWidth, 6, 'F');
    
    doc.text('DESCRIZIONE ARTICOLO', margin + 2, currentY);
    doc.text('UM', margin + 85, currentY);
    doc.text('COLLI', margin + 100, currentY);
    doc.text('QUANTITÀ (KG)', margin + 120, currentY);
    doc.text('LOTTO', margin + 150, currentY);
    doc.text('ORIGINE', margin + 175, currentY);
    
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const ddtPallets = history.filter(p => (ddt.palletIds || []).includes(p.id));
    
    // Raggruppamento per Articolo e Lotto
    const productSummary: Record<string, { count: number, weight: number, um: string, origin: string, batches: Set<string> }> = {};
    
    ddtPallets.forEach(p => {
      p.lines.forEach(l => {
        const key = `${l.articleCode}`;
        if (!productSummary[key]) {
          const art = articles.find(a => a.code === l.articleCode);
          productSummary[key] = { 
            count: 0, 
            weight: 0, 
            um: art?.um || 'KG', 
            origin: art?.origin || 'ITALIA',
            batches: new Set()
          };
        }
        productSummary[key].count += parseInt(l.count || '0');
        productSummary[key].weight += parseFloat(l.netWeight || '0');
        if (l.batch) productSummary[key].batches.add(l.batch);
      });
    });

    let totalColli = 0;
    let totalWeight = 0;

    Object.entries(productSummary).forEach(([code, data]) => {
      const art = articles.find(a => a.code === code);
      doc.text(art?.description || code, margin + 2, currentY);
      doc.text(data.um, margin + 85, currentY);
      doc.text(data.count.toString(), margin + 100, currentY);
      doc.text(data.weight.toFixed(2), margin + 120, currentY);
      doc.text(Array.from(data.batches).join(', ').substring(0, 20), margin + 150, currentY);
      doc.text(data.origin, margin + 175, currentY);
      
      totalColli += data.count;
      totalWeight += data.weight;
      
      currentY += 5;
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, currentY - 1, width - margin, currentY - 1);
    });

    // Totali Tabella
    currentY += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('TOTALI:', margin + 80, currentY);
    doc.text(totalColli.toString(), margin + 100, currentY);
    doc.text(totalWeight.toFixed(2), margin + 120, currentY);

    // Riepilogo Pesi
    let totalTare = 0;
    let totalGross = 0;
    ddtPallets.forEach(p => {
      totalTare += parseFloat(p.totalTare || '0');
      totalGross += parseFloat(p.totalGrossWeight || '0');
    });

    currentY += 6;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Riepilogo Pesi (kg) - Netto: ${totalWeight.toFixed(2)} | Tara: ${totalTare.toFixed(2)} | Lordo: ${totalGross.toFixed(2)}`, margin + 2, currentY);

    currentY += 10;

    // --- DETTAGLI TRASPORTO (BOX INFERIORE) ---
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, currentY, colWidth, 45);
    
    const boxY = currentY + 5;
    doc.setFontSize(7);
    doc.text('PORTO', margin + 2, boxY);
    doc.text('ASPETTO ESTERIORE BENI', margin + 40, boxY);
    doc.text('CAUSALE TRASPORTO', margin + 100, boxY);
    
    doc.setFont('helvetica', 'normal');
    doc.text(ddt.port, margin + 2, boxY + 4);
    doc.text(ddt.goodsAppearance, margin + 40, boxY + 4);
    doc.text(ddt.transportReason, margin + 100, boxY + 4);

    const boxY2 = boxY + 12;
    doc.setFont('helvetica', 'bold');
    doc.text('TRASPORTO A MEZZO', margin + 2, boxY2);
    doc.text('TARGA MOTRICE', margin + 40, boxY2);
    doc.text('TARGA RIMORCHIO', margin + 75, boxY2);
    doc.text('INIZIO TRASPORTO', margin + 110, boxY2);
    
    doc.setFont('helvetica', 'normal');
    doc.text(ddt.carrierName, margin + 2, boxY2 + 4);
    doc.text(ddt.licensePlate || '-', margin + 40, boxY2 + 4);
    doc.text(ddt.trailerPlate || '-', margin + 75, boxY2 + 4);
    doc.text(ddt.transportStartDateTime.replace('T', ' '), margin + 110, boxY2 + 4);

    const boxY3 = boxY2 + 12;
    doc.setFont('helvetica', 'bold');
    doc.text('VETTORE', margin + 2, boxY3);
    doc.setFont('helvetica', 'normal');
    doc.text(ddt.carrierName + (ddt.carrierAddress ? ` - ${ddt.carrierAddress}` : ''), margin + 2, boxY3 + 4);

    const boxY4 = boxY3 + 12;
    doc.setFont('helvetica', 'bold');
    doc.text('POSTI PALLET A TERRA:', margin + 2, boxY4);
    doc.setFont('helvetica', 'normal');
    doc.text(ddt.palletCount.toString(), margin + 40, boxY4);

    // --- FIRME ---
    currentY += 55;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA VETTORE', margin, currentY);
    doc.line(margin, currentY + 10, margin + 45, currentY + 10);
    
    doc.text('FIRMA CONDUCENTE', margin + 65, currentY);
    doc.line(margin + 65, currentY + 10, margin + 110, currentY + 10);
    
    doc.text('FIRMA DESTINATARIO', margin + 130, currentY);
    doc.line(margin + 130, currentY + 10, margin + 185, currentY + 10);

    // --- FOOTER ---
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('Documento generato da AgroGestionale GS1 System - Pagina 1/1', width / 2, 285, { align: 'center' });

    doc.save(`DDT_${ddt.number.replace(/\//g, '_')}.pdf`);
  };

  // generatePDF removed
  // const generatePDF = async () => { ... }

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-sans">
      {/* Sidebar Navigation */}
      <div className="flex flex-col md:flex-row min-h-screen">
        <Sidebar currentView={view} onViewChange={setView} />

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {/* Top Bar / Company Header */}
          <div className="flex justify-between items-center mb-10 pb-4 border-b border-black/5">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-sm border border-black/5">
                <Home className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-black/40 leading-none">Azienda Attiva</p>
                <p className="text-sm font-bold">{senderName}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] uppercase font-bold text-black/40 leading-none">Stato Sistema</p>
                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-end">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Operativo
                </p>
              </div>
              <button 
                onClick={() => setView('IMPOSTAZIONI')}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <Settings className="w-5 h-5 text-black/40" />
              </button>
            </div>
          </div>

          {view === 'DASHBOARD' && (
            <div className="max-w-6xl mx-auto space-y-10">
              <header className="flex justify-between items-end border-b border-black/10 pb-8">
                <div>
                  <h2 className="text-4xl font-serif font-bold tracking-tight">Dashboard Operativa</h2>
                  <p className="text-sm text-black/40 font-medium">Panoramica delle attività logistiche e tracciabilità</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-black/40">Data Odierna</p>
                  <p className="text-sm font-bold">{new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="bg-indigo-50 p-3 rounded-2xl">
                      <Package className="w-6 h-6 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +12%
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-black/40">Pedane Totali</p>
                    <p className="text-3xl font-serif font-bold">{history.length}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="bg-amber-50 p-3 rounded-2xl">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-black/40">In Attesa DDT</p>
                    <p className="text-3xl font-serif font-bold text-amber-600">{history.filter(p => !p.ddtId).length}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="bg-emerald-50 p-3 rounded-2xl">
                      <FileText className="w-6 h-6 text-emerald-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-black/40">DDT Emessi</p>
                    <p className="text-3xl font-serif font-bold text-emerald-600">{ddts.length}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="bg-blue-50 p-3 rounded-2xl">
                      <WeightIcon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-black/40">Peso Totale Spedito</p>
                    <p className="text-3xl font-serif font-bold text-blue-600">
                      {(history || []).reduce((acc, p) => acc + parseFloat(p.totalNetWeight || '0'), 0).toFixed(0)} <span className="text-sm">kg</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-black/5 overflow-hidden">
                  <div className="p-6 border-b border-black/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Ultime Pedane Create</h3>
                    <button onClick={() => setView('STORICO')} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                      Vedi tutto <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#f9f9f9] border-b border-black/5">
                        <tr>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold text-black/40">SSCC</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold text-black/40">Destinatario</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold text-black/40">Stato</th>
                          <th className="px-6 py-4 text-[10px] uppercase font-bold text-black/40">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 5).map((p) => (
                          <tr key={p.id} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold">{p.sscc}</td>
                            <td className="px-6 py-4 text-sm">{recipients.find(r => r.code === p.recipientCode)?.name || p.recipientCode}</td>
                            <td className="px-6 py-4">
                              {p.ddtId ? (
                                <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-100 flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3" /> Spedito
                                </span>
                              ) : (
                                <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-100 flex items-center gap-1 w-fit">
                                  <AlertCircle className="w-3 h-3" /> In Attesa
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-black/40">{p.date.split(',')[0]}</td>
                          </tr>
                        ))}
                        {history.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-10 text-center text-black/40 text-sm">Nessuna pedana registrata</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] text-white rounded-[2rem] p-8 space-y-6">
                  <h3 className="font-bold text-lg">Azioni Rapide</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setView('PALLET')}
                      className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/90 transition-all"
                    >
                      <Plus className="w-5 h-5" /> Nuova Pedana
                    </button>
                    <button 
                      onClick={() => setView('DDT')}
                      className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/20 transition-all"
                    >
                      <FileText className="w-5 h-5" /> Crea Nuovo DDT
                    </button>
                    <button 
                      onClick={() => setView('ARTICOLI')}
                      className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/20 transition-all"
                    >
                      <Tag className="w-5 h-5" /> Gestisci Articoli
                    </button>
                  </div>
                  <div className="pt-6 border-t border-white/10">
                    <p className="text-[10px] uppercase font-bold text-white/40 mb-2">Prossimo SSCC</p>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <p className="font-mono text-lg font-bold text-emerald-400">{currentSSCC}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'PALLET' && (
            <PalletCompositionPage
              recipients={recipients}
              articles={articles}
              packagings={packagings}
              palletMasters={palletMasters}
              companyPrefix={companyPrefix}
              serialNumber={serialNumber}
              setSerialNumber={setSerialNumber}
              saveToHistory={saveToHistory}
              senderName={senderName}
              senderAddress={senderAddress}
              initialData={editingPallet || undefined}
              onCancel={() => {
                setEditingPallet(null);
                setView('STORICO');
              }}
            />
          )}

          {view === 'ARTICOLI' && (
            <ArticlesPage
              articles={articles}
              packagings={packagings}
              onSave={(newArticle) => {
                const exists = articles.find(a => a.code === newArticle.code);
                if (exists) {
                  setArticles(articles.map(a => a.code === newArticle.code ? newArticle : a));
                } else {
                  setArticles([...articles, newArticle]);
                }
              }}
              onDelete={(article) => {
                setArticles(articles.filter(a => a.code !== article.code));
              }}
            />
          )}

          {view === 'IMBALLAGGI' && (
            <PackagingsPage
              packagings={packagings}
              onSave={(newPackaging) => {
                const exists = packagings.find(p => p.id === newPackaging.id);
                if (exists) {
                  setPackagings(packagings.map(p => p.id === newPackaging.id ? newPackaging : p));
                } else {
                  setPackagings([...packagings, newPackaging]);
                }
              }}
              onDelete={(packaging) => {
                setPackagings(packagings.filter(p => p.id !== packaging.id));
              }}
            />
          )}

          {view === 'PALLET_MASTER' && (
            <PalletsPage
              pallets={palletMasters}
              onSave={(newPallet) => {
                const exists = palletMasters.find(p => p.id === newPallet.id);
                if (exists) {
                  setPalletMasters(palletMasters.map(p => p.id === newPallet.id ? newPallet : p));
                } else {
                  setPalletMasters([...palletMasters, newPallet]);
                }
              }}
              onDelete={(pallet) => {
                setPalletMasters(palletMasters.filter(p => p.id !== pallet.id));
              }}
            />
          )}

          {view === 'CLIENTI' && (
            <RecipientsPage
              recipients={recipients}
              onSave={(newRecipient) => {
                const exists = recipients.find(r => r.code === newRecipient.code);
                if (exists) {
                  setRecipients(recipients.map(r => r.code === newRecipient.code ? newRecipient : r));
                } else {
                  setRecipients([...recipients, newRecipient]);
                }
              }}
              onDelete={(recipient) => {
                setRecipients(recipients.filter(r => r.code !== recipient.code));
              }}
            />
          )}

          {view === 'DDT' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <header className="flex justify-between items-end border-b border-black/10 pb-6">
                <div>
                  <h2 className="text-4xl font-serif font-bold tracking-tight">
                    {editingDdt ? 'Modifica DDT' : 'Gestione DDT'}
                  </h2>
                  <p className="text-sm text-black/40 font-medium">
                    {editingDdt ? `Modificando DDT n. ${editingDdt.number}` : 'Crea un nuovo documento di trasporto raggruppando le pedane'}
                  </p>
                </div>
                {editingDdt && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditingDdt(null);
                      setCurrentDdtNumber('');
                      setSelectedPalletIds([]);
                    }}
                    className="rounded-xl"
                  >
                    Annulla Modifica
                  </Button>
                )}
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Creazione DDT */}
                <section className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-lg">Nuovo DDT</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Cliente</label>
                      <select 
                        value={selectedRecipientCode}
                        onChange={(e) => {
                          setSelectedRecipientCode(e.target.value);
                          setSelectedPalletIds([]);
                        }}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Seleziona cliente...</option>
                        {recipients.map(r => (
                          <option key={r.code} value={r.code}>{r.code} - {r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Numero DDT</label>
                      <input 
                        type="text" 
                        value={currentDdtNumber}
                        onChange={(e) => setCurrentDdtNumber(e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Es. 001/2026"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Data DDT</label>
                      <input 
                        type="date" 
                        value={currentDdtDate}
                        onChange={(e) => setCurrentDdtDate(e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="pt-4 border-t border-black/5 space-y-4">
                      <p className="text-[10px] uppercase font-bold text-indigo-600">Dati Trasporto Legali</p>
                      
                      <div>
                        <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Vettore</label>
                        <input 
                          type="text" 
                          value={carrierName}
                          onChange={(e) => setCarrierName(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          placeholder="Nome Vettore"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Causale Trasporto</label>
                        <input 
                          type="text" 
                          value={transportReason}
                          onChange={(e) => setTransportReason(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Aspetto dei Beni</label>
                        <input 
                          type="text" 
                          value={goodsAppearance}
                          onChange={(e) => setGoodsAppearance(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Inizio Trasporto (Data/Ora)</label>
                        <input 
                          type="datetime-local" 
                          value={transportStartDateTime}
                          onChange={(e) => setTransportStartDateTime(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Porto</label>
                          <select 
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          >
                            <option value="Franco">Franco</option>
                            <option value="Assegnato">Assegnato</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Posti Pallet</label>
                          <div className="w-full bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 text-sm font-bold text-indigo-700">
                            {selectedPalletIds.length}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Targa Motrice</label>
                          <input 
                            type="text" 
                            value={licensePlate}
                            onChange={(e) => setLicensePlate(e.target.value)}
                            className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                            placeholder="AA123BB"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Targa Rimorchio</label>
                          <input 
                            type="text" 
                            value={trailerPlate}
                            onChange={(e) => setTrailerPlate(e.target.value)}
                            className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                            placeholder="XA123BB"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={createDDT}
                      disabled={!selectedRecipientCode || !currentDdtNumber || selectedPalletIds.length === 0}
                      className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200"
                    >
                      {editingDdt ? 'Salva Modifiche DDT' : 'Crea Documento'}
                    </button>
                  </div>

                  {/* Riepilogo DDT Dinamico */}
                  {selectedPalletIds.length > 0 && (
                    <div className="mt-8 p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs uppercase font-bold text-indigo-900 tracking-wider">Riepilogo DDT</h4>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-indigo-600 uppercase">Documento in creazione</p>
                          <p className="text-xs font-bold">n. {currentDdtNumber || '---'} del {currentDdtDate}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-indigo-100">
                          <p className="text-[9px] uppercase font-bold text-black/40">Totale Colli</p>
                          <p className="text-xl font-serif font-bold text-indigo-600">
                            {(history || [])
                              .filter(p => selectedPalletIds.includes(p.id))
                              .reduce((acc, p) => acc + (p.lines || []).reduce((lAcc, l) => lAcc + parseInt(l.count || '0'), 0), 0)}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-indigo-100">
                          <p className="text-[9px] uppercase font-bold text-black/40">Peso Lordo Totale</p>
                          <p className="text-xl font-serif font-bold text-indigo-600">
                            {(history || [])
                              .filter(p => selectedPalletIds.includes(p.id))
                              .reduce((acc, p) => acc + parseFloat(p.totalGrossWeight || '0'), 0)
                              .toFixed(2)} kg
                          </p>
                          <p className="text-[8px] text-indigo-400 mt-1">
                            Netto: {(history || []).filter(p => selectedPalletIds.includes(p.id)).reduce((acc, p) => acc + parseFloat(p.totalNetWeight || '0'), 0).toFixed(2)} | 
                            Tara: {(history || []).filter(p => selectedPalletIds.includes(p.id)).reduce((acc, p) => acc + parseFloat(p.totalTare || '0'), 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[9px] uppercase font-bold text-black/40">Dettaglio Prodotti</p>
                        <div className="bg-white rounded-2xl border border-indigo-100 overflow-hidden">
                          <table className="w-full text-left text-[10px]">
                            <thead className="bg-indigo-50/50 border-b border-indigo-100">
                              <tr>
                                <th className="px-3 py-2 font-bold text-indigo-900">Prodotto</th>
                                <th className="px-3 py-2 font-bold text-indigo-900 text-right">Colli</th>
                                <th className="px-3 py-2 font-bold text-indigo-900 text-right">Peso</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const productSummary: Record<string, { count: number, weight: number }> = {};
                                (history || [])
                                  .filter(p => selectedPalletIds.includes(p.id))
                                  .forEach(p => {
                                    (p.lines || []).forEach(l => {
                                      if (!productSummary[l.articleCode]) {
                                        productSummary[l.articleCode] = { count: 0, weight: 0 };
                                      }
                                      productSummary[l.articleCode].count += parseInt(l.count || '0');
                                      productSummary[l.articleCode].weight += parseFloat(l.netWeight || '0');
                                    });
                                  });
                                
                                return Object.entries(productSummary).map(([code, data]) => (
                                  <tr key={code} className="border-b border-indigo-50 last:border-0">
                                    <td className="px-3 py-2 font-medium">{articles.find(a => a.code === code)?.description || code}</td>
                                    <td className="px-3 py-2 text-right font-mono">{data.count}</td>
                                    <td className="px-3 py-2 text-right font-mono">{data.weight.toFixed(2)} kg</td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                {/* Selezione Pedane */}
                <section className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-black/5">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg">Seleziona Pedane da Accompagnare</h3>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                      {selectedPalletIds.length} selezionate
                    </span>
                  </div>

                  {!selectedRecipientCode ? (
                    <div className="py-20 text-center border-2 border-dashed border-black/5 rounded-3xl">
                      <p className="text-black/30 text-sm">Seleziona prima un cliente per vedere le pedane disponibili</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {history
                        .filter(p => p.recipientCode === selectedRecipientCode && (!p.ddtId || p.ddtId === editingDdt?.id))
                        .map(pallet => {
                          const totalWeight = parseFloat(pallet.totalNetWeight || '0');
                          const totalColli = (pallet.lines || []).reduce((acc, l) => acc + parseInt(l.count || '0'), 0);
                          
                          return (
                            <button
                              key={pallet.id}
                              onClick={() => {
                                if (selectedPalletIds.includes(pallet.id)) {
                                  setSelectedPalletIds(selectedPalletIds.filter(id => id !== pallet.id));
                                } else {
                                  setSelectedPalletIds([...selectedPalletIds, pallet.id]);
                                }
                              }}
                              className={cn(
                                "text-left p-5 rounded-3xl border transition-all relative group",
                                selectedPalletIds.includes(pallet.id) 
                                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" 
                                  : "border-black/5 bg-[#f9f9f9] hover:border-black/20"
                              )}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                  <Package className={cn("w-5 h-5", selectedPalletIds.includes(pallet.id) ? "text-indigo-600" : "text-black/40")} />
                                  <div>
                                    <p className="font-mono font-bold text-sm leading-none">{pallet.sscc}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold text-black/60">{totalColli} Colli</p>
                                  <p className="text-[10px] font-bold text-indigo-600">Netto: {parseFloat(pallet.totalNetWeight).toFixed(2)} kg</p>
                                  <p className="text-[8px] text-black/40">Lordo: {parseFloat(pallet.totalGrossWeight).toFixed(2)} kg</p>
                                </div>
                              </div>
                              
                              <div className="space-y-1 mt-3 pt-3 border-t border-black/5">
                                {pallet.lines.map((l, i) => {
                                  const art = articles.find(a => a.code === l.articleCode);
                                  return (
                                    <div key={i} className="flex justify-between items-center text-[10px]">
                                      <span className="text-black/60 truncate max-w-[120px]">{art?.description || l.articleCode}</span>
                                      <span className="font-mono font-bold">x{l.count}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-black/30 mt-3 text-right italic">{pallet.date}</p>
                            </button>
                          );
                        })}
                      {history.filter(p => p.recipientCode === selectedRecipientCode && (!p.ddtId || p.ddtId === editingDdt?.id)).length === 0 && (
                        <div className="col-span-full py-10 text-center">
                          <p className="text-black/30 text-sm italic">Nessuna pedana libera trovata per questo cliente</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lista DDT Esistenti */}
                  <div className="mt-12 pt-8 border-t border-black/10">
                    <h3 className="font-bold text-lg mb-6">DDT Recenti</h3>
                    <div className="space-y-4">
                      {ddts.map(ddt => (
                        <div key={ddt.id} className="flex items-center justify-between p-4 bg-[#f9f9f9] rounded-2xl border border-black/5">
                          <div className="flex items-center gap-4">
                            <div className="bg-white p-2 rounded-xl shadow-sm">
                              <Layers className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">DDT n. {ddt.number}</p>
                              <p className="text-[10px] text-black/40">{ddt.date} • {recipients.find(r => r.code === ddt.recipientCode)?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-2">
                              <p className="text-[10px] font-bold text-black/60">{(ddt.palletIds || []).length} Pedane</p>
                            </div>
                            <button 
                              onClick={() => generateDdtPDF(ddt)}
                              className="p-2 hover:bg-white rounded-xl text-indigo-600 transition-colors shadow-sm"
                              title="Scarica PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => startEditDdt(ddt)}
                              className="p-2 hover:bg-white rounded-xl text-amber-600 transition-colors shadow-sm"
                              title="Modifica"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteDdt(ddt.id)}
                              className="p-2 hover:bg-white rounded-xl text-red-600 transition-colors shadow-sm"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
          {view === 'STORICO' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-black/10 pb-6 gap-4">
                <div>
                  <h2 className="text-3xl font-serif font-bold">Storico Pedane</h2>
                  <p className="text-xs text-black/40 font-medium">Archivio di tutte le unità logistiche generate</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                    <input 
                      type="text" 
                      placeholder="Cerca SSCC o Lotto..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button onClick={() => setHistory([])} className="text-red-500 text-xs font-bold hover:underline whitespace-nowrap">Svuota Archivio</button>
                </div>
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {history
                  .filter(p => 
                    p.sscc.includes(searchQuery) || 
                    p.lines.some(l => l.batch.includes(searchQuery) || l.articleCode.includes(searchQuery))
                  )
                  .map((entry) => (
                    <div key={entry.id} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="bg-[#f5f2ed] p-3 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                            <Package className="w-6 h-6 text-black/60 group-hover:text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-black/40 leading-none mb-1">SSCC</p>
                            <p className="font-mono font-bold text-lg">{entry.sscc}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingPallet(entry);
                              setView('PALLET');
                            }}
                            className="p-2 hover:bg-indigo-50 rounded-xl text-indigo-600 transition-colors"
                            title="Modifica"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deletePallet(entry.id)}
                            className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3 border-t border-black/5 pt-4">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold">{recipients.find(r => r.code === entry.recipientCode)?.name || 'Cliente Sconosciuto'}</p>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-indigo-600">Lordo: {entry.totalGrossWeight} kg</p>
                            <p className="text-[8px] text-black/40">Netto: {entry.totalNetWeight} | Tara: {entry.totalTare}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] text-black/40">{entry.date}</p>
                          {entry.ddtId ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              DDT: {ddts.find(d => d.id === entry.ddtId)?.number}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                              In Attesa Spedizione
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-[9px] uppercase font-bold text-black/30 mb-1">Dettaglio Contenuto</p>
                          <div className="space-y-1">
                            {entry.lines.map((l, i) => (
                              <div key={i} className="flex justify-between items-center bg-black/5 px-2 py-1 rounded text-[9px] font-mono">
                                <span>{articles.find(a => a.code === l.articleCode)?.description || l.articleCode}</span>
                                <span className="font-bold">Lotto: {l.batch} • x{l.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {history.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-black/20">
                    <p className="text-black/40 font-medium">Nessuna pedana registrata nell'archivio.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'IMPOSTAZIONI' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <header className="border-b border-black/10 pb-6">
                <h2 className="text-3xl font-serif font-bold">Impostazioni Sistema</h2>
                <p className="text-sm text-black/40 font-medium">Configura i parametri aziendali e GS1</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-lg">Anagrafica Aziendale</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Ragione Sociale</label>
                      <input 
                        type="text" 
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Indirizzo Sede</label>
                      <input 
                        type="text" 
                        value={senderAddress}
                        onChange={(e) => setSenderAddress(e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">P.IVA / C.F.</label>
                        <input 
                          type="text" 
                          value={senderVat}
                          onChange={(e) => setSenderVat(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Telefono</label>
                        <input 
                          type="text" 
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Email / PEC</label>
                      <input 
                        type="email" 
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </section>

                <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-lg">Parametri GS1</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Prefisso Aziendale GS1</label>
                      <input 
                        type="text" 
                        value={companyPrefix}
                        onChange={(e) => setCompanyPrefix(e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        placeholder="8012345"
                      />
                      <p className="text-[9px] text-black/40 mt-1 italic">Utilizzato per generare SSCC e GTIN</p>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Prossimo Numero Seriale SSCC</label>
                      <input 
                        type="number" 
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(parseInt(e.target.value) || 1)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-[10px] uppercase font-bold text-indigo-900 mb-1">Esempio SSCC Prossimo</p>
                      <p className="font-mono text-lg font-bold text-indigo-600">{currentSSCC}</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="bg-[#1a1a1a] text-white p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="font-bold text-lg">Backup e Dati</h3>
                  <p className="text-sm text-white/40">Esporta i dati locali per sicurezza o migrazione</p>
                </div>
                <div className="flex gap-3">
                  <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all">
                    Esporta JSON
                  </button>
                  <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-6 py-3 rounded-xl text-sm font-bold transition-all">
                    Reset Totale
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
