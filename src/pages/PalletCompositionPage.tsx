import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Package, 
  Weight as WeightIcon, 
  ArrowRight,
  Truck,
  AlertCircle
} from 'lucide-react';
import { 
  MasterArticle, 
  MasterPackaging, 
  MasterPallet, 
  MasterRecipient, 
  PalletLine,
  PalletHistory
} from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import bwipjs from 'bwip-js';
import { jsPDF } from 'jspdf';

interface PalletCompositionPageProps {
  recipients: MasterRecipient[];
  articles: MasterArticle[];
  packagings: MasterPackaging[];
  palletMasters: MasterPallet[];
  companyPrefix: string;
  serialNumber: number;
  setSerialNumber: React.Dispatch<React.SetStateAction<number>>;
  saveToHistory: (sscc: string, lines: PalletLine[], recipientCode: string, totals: { net: string, gross: string, tare: string }, id?: string) => void;
  senderName: string;
  senderAddress: string;
  initialData?: PalletHistory;
  onCancel?: () => void;
}

export const PalletCompositionPage: React.FC<PalletCompositionPageProps> = ({
  recipients,
  articles,
  packagings,
  palletMasters,
  companyPrefix,
  serialNumber,
  setSerialNumber,
  saveToHistory,
  senderName,
  senderAddress,
  initialData,
  onCancel
}) => {
  const [selectedRecipientCode, setSelectedRecipientCode] = useState(initialData?.recipientCode || '');
  const [warning, setWarning] = useState<string | null>(null);
  
  // Header Pallet Configuration Removed
  // const [selectedPalletBaseId, setSelectedPalletBaseId] = useState('');
  // const [palletBaseCount, setPalletBaseCount] = useState(1);
  // const [palletBaseTare, setPalletBaseTare] = useState('0');

  const [lines, setLines] = useState<PalletLine[]>(initialData?.lines || [{
    id: crypto.randomUUID(),
    articleCode: '',
    batch: '',
    count: '',
    harvestDate: new Date().toISOString().split('T')[0],
    packagingId: '',
    packagingTare: '0',
    pallets: [],
    grossWeight: '',
    netWeight: '0'
  }]);

  // Calculate SSCC
  const calculateSSCC = (prefix: string, serial: number) => {
    const serialStr = serial.toString().padStart(17 - prefix.length, '0');
    const raw = `${prefix}${serialStr}`;
    
    let sum = 0;
    for (let i = 0; i < raw.length; i++) {
      const digit = parseInt(raw[i]);
      sum += (i % 2 === 0) ? digit * 3 : digit;
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return `${raw}${checkDigit}`;
  };

  const currentSSCC = initialData?.sscc || calculateSSCC(companyPrefix, serialNumber);

  const addLine = () => {
    setLines([...lines, {
      id: crypto.randomUUID(),
      articleCode: '',
      batch: '',
      count: '',
      harvestDate: new Date().toISOString().split('T')[0],
      packagingId: '',
      packagingTare: '0',
      pallets: [],
      grossWeight: '',
      netWeight: '0'
    }]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const addPalletToLine = (lineId: string, palletMasterId: string) => {
    const palletMaster = palletMasters.find(p => p.id === palletMasterId);
    if (!palletMaster) return;

    setLines(lines.map(line => {
      if (line.id !== lineId) return line;
      
      const newPallets = [...(line.pallets || []), {
        _id: crypto.randomUUID(),
        masterId: palletMaster.id,
        name: palletMaster.name,
        tare: palletMaster.tare
      }];

      // Recalculate
      const art = articles.find(a => a.code === line.articleCode);
      const pkgTare = parseFloat(line.packagingTare || '0');
      const count = parseFloat(line.count || '0');
      const palletsTare = (newPallets || []).reduce((acc, p) => acc + parseFloat(p.tare || '0'), 0);
      const totalLineTare = (pkgTare * count) + palletsTare;

      const isFixedWeight = art?.weightType === 'FIXED' || art?.um === 'PZ';
      let net = parseFloat(line.netWeight || '0');
      let gross = parseFloat(line.grossWeight || '0');

      if (isFixedWeight) {
        const unitWeight = parseFloat(art?.unitWeight || '0');
        net = unitWeight * count;
        gross = net + totalLineTare;
      } else {
        net = Math.max(0, gross - totalLineTare);
      }

      return {
        ...line,
        pallets: newPallets,
        netWeight: net.toFixed(2),
        grossWeight: gross.toFixed(2)
      };
    }));
  };

  const removePalletFromLine = (lineId: string, palletInstanceId: string) => {
    setLines(lines.map(line => {
      if (line.id !== lineId) return line;
      
      const newPallets = (line.pallets || []).filter(p => p._id !== palletInstanceId);

      // Recalculate
      const art = articles.find(a => a.code === line.articleCode);
      const pkgTare = parseFloat(line.packagingTare || '0');
      const count = parseFloat(line.count || '0');
      const palletsTare = (newPallets || []).reduce((acc, p) => acc + parseFloat(p.tare || '0'), 0);
      const totalLineTare = (pkgTare * count) + palletsTare;

      const isFixedWeight = art?.weightType === 'FIXED' || art?.um === 'PZ';
      let net = parseFloat(line.netWeight || '0');
      let gross = parseFloat(line.grossWeight || '0');

      if (isFixedWeight) {
        const unitWeight = parseFloat(art?.unitWeight || '0');
        net = unitWeight * count;
        gross = net + totalLineTare;
      } else {
        net = Math.max(0, gross - totalLineTare);
      }

      return {
        ...line,
        pallets: newPallets,
        netWeight: net.toFixed(2),
        grossWeight: gross.toFixed(2)
      };
    }));
  };

  const updateLine = (id: string, field: keyof PalletLine, value: string) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;

      const updatedLine = { ...line, [field]: value };
      setWarning(null);

      // Auto-fill packaging tare
      if (field === 'packagingId') {
        const pkg = packagings.find(p => p.id === value);
        updatedLine.packagingTare = pkg ? pkg.tare : '0';
      }

      // Auto-fill article defaults
      if (field === 'articleCode') {
        const art = articles.find(a => a.code === value);
        if (art) {
          if (art.defaultPackagingId) {
            updatedLine.packagingId = art.defaultPackagingId;
            const pkg = packagings.find(p => p.id === art.defaultPackagingId);
            if (pkg) {
              updatedLine.packagingTare = pkg.tare;
              if (!pkg.tare || pkg.tare === '0') {
                setWarning(`Attenzione: L'imballaggio di default per ${art.description} ha una tara mancante o uguale a zero.`);
              }
            } else {
              setWarning(`Attenzione: L'imballaggio di default configurato per ${art.description} non è stato trovato.`);
            }
          } else {
            setWarning(`Nota: Nessun imballaggio di default configurato per ${art.description}.`);
          }
        }
      }

      // Recalculate Net Weight
      const art = articles.find(a => a.code === updatedLine.articleCode);
      const pkgTare = parseFloat(updatedLine.packagingTare || '0');
      const count = parseFloat(updatedLine.count || '0');
      const palletsTare = (updatedLine.pallets || []).reduce((acc, p) => acc + parseFloat(p.tare || '0'), 0);
      const totalLineTare = (pkgTare * count) + palletsTare;

      const isFixedWeight = art?.weightType === 'FIXED' || art?.um === 'PZ';

      if (isFixedWeight) {
        const unitWeight = parseFloat(art?.unitWeight || '0');
        const net = unitWeight * count;
        updatedLine.netWeight = net.toFixed(2);
        updatedLine.grossWeight = (net + totalLineTare).toFixed(2);
      } else {
        const gross = parseFloat(updatedLine.grossWeight || '0');
        const net = Math.max(0, gross - totalLineTare);
        updatedLine.netWeight = net.toFixed(2);
      }
      
      return updatedLine;
    }));
  };

  // Calculate Totals
  const totals = (lines || []).reduce((acc, line) => {
    const palletsTare = (line.pallets || []).reduce((pAcc, p) => pAcc + parseFloat(p.tare || '0'), 0);
    const lineTare = (parseFloat(line.packagingTare || '0') * parseFloat(line.count || '0')) + palletsTare;
    
    return {
      net: acc.net + parseFloat(line.netWeight || '0'),
      gross: acc.gross + parseFloat(line.grossWeight || '0'),
      lineTare: acc.lineTare + lineTare
    };
  }, { net: 0, gross: 0, lineTare: 0 });

  // Final Totals
  const finalGrossWeight = totals.gross;
  const finalTotalTare = totals.lineTare;


  const normalizeGtin = (gtin?: string): string => (gtin || '').replace(/\D/g, '').padStart(14, '0').slice(-14);

  const buildGs1Payload = () => {
    const uniqueArticleCodes = Array.from(new Set(lines.map(line => line.articleCode).filter(Boolean))) as string[];
    const uniqueBatches = Array.from(new Set(lines.map(line => line.batch.trim()).filter(Boolean))) as string[];
    const uniqueHarvestDates = Array.from(new Set(lines.map(line => line.harvestDate).filter(Boolean))) as string[];

    const firstArticle = articles.find(a => a.code === uniqueArticleCodes[0]);
    const totalColli = lines.reduce((acc, line) => acc + parseInt(line.count || '0', 10), 0);

    let gs1HumanReadable = `(00)${currentSSCC}`;
    let gs1BarcodeText = `(00)${currentSSCC}`;

    if (uniqueArticleCodes.length === 1 && firstArticle?.gtin) {
      const gtin14 = normalizeGtin(firstArticle.gtin);
      gs1HumanReadable += `(02)${gtin14}`;
      gs1BarcodeText += `(02)${gtin14}`;

      if (totalColli > 0) {
        gs1HumanReadable += `(37)${totalColli}`;
        gs1BarcodeText += `(37)${totalColli}`;
      }
    }

    if (totals.net > 0) {
      const weightAi3102 = Math.round(totals.net * 100).toString().padStart(6, '0');
      gs1HumanReadable += `(3102)${weightAi3102}`;
      gs1BarcodeText += `(3102)${weightAi3102}`;
    }

    if (uniqueBatches.length === 1) {
      gs1HumanReadable += `(10)${uniqueBatches[0]}`;
      gs1BarcodeText += `(10)${uniqueBatches[0]}`;
    }

    if (uniqueHarvestDates.length === 1) {
      const harvest = uniqueHarvestDates[0].replace(/-/g, '');
      if (harvest.length === 8) {
        gs1HumanReadable += `(7007)${harvest}`;
        gs1BarcodeText += `(7007)${harvest}`;
      }
    }

    return {
      gs1HumanReadable,
      gs1BarcodeText,
      hasMixedContent: uniqueArticleCodes.length > 1 || uniqueBatches.length > 1,
    };
  };

  const generatePDF = async () => {
    const recipient = recipients.find(r => r.code === selectedRecipientCode);
    if (!recipient) {
      alert('Seleziona un cliente valido');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const margin = 10;
    const width = 148;
    const height = 210;

    // --- SEZIONE SUPERIORE: MITTENTE / DESTINATARIO ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM (MITTENTE):', margin, margin + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(senderName, margin, margin + 10);
    doc.setFontSize(8);
    doc.text(senderAddress, margin, margin + 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TO (DESTINATARIO):', width / 2 + 5, margin + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(recipient.name, width / 2 + 5, margin + 10);
    doc.setFontSize(8);
    doc.text(recipient.address, width / 2 + 5, margin + 14);

    doc.setLineWidth(0.5);
    doc.line(margin, margin + 20, width - margin, margin + 20);

    // --- SEZIONE CENTRALE: TABELLA CONTENUTO ---
    let currentY = margin + 30;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CONTENT / CONTENUTO PEDANA', margin, currentY);
    currentY += 8;
    
    doc.setFontSize(8);
    doc.setFillColor(245, 242, 237);
    doc.rect(margin, currentY - 4, width - 2 * margin, 6, 'F');
    doc.text('DESCRIZIONE', margin + 2, currentY);
    doc.text('LOTTO', margin + 55, currentY);
    doc.text('ORIGINE', margin + 85, currentY);
    doc.text('PESO', margin + 105, currentY);
    doc.text('COLLI', margin + 120, currentY);
    
    currentY += 6;
    doc.setLineWidth(0.2);
    doc.line(margin, currentY - 4, width - margin, currentY - 4);

    lines.forEach((line) => {
      const article = articles.find(a => a.code === line.articleCode);
      const pkg = packagings.find(p => p.id === line.packagingId);
      
      doc.setFont('helvetica', 'normal');
      doc.text((article?.description || 'N/A').substring(0, 30), margin + 2, currentY);
      doc.text(line.batch.substring(0, 15), margin + 55, currentY);
      doc.text(article?.origin || '-', margin + 85, currentY);
      doc.text(`${line.netWeight}kg`, margin + 105, currentY);
      doc.text(line.count, margin + 120, currentY);
      
      currentY += 4;
      doc.setFontSize(6);
      doc.setTextColor(150, 150, 150);
      let detail = `Imballo: ${pkg?.name || 'N/A'} (${line.packagingTare}kg)`;
      
      if (line.pallets && line.pallets.length > 0) {
        const palletsStr = line.pallets.map(p => `${p.name} (${p.tare}kg)`).join(', ');
        detail += ` + Pallets: ${palletsStr}`;
      }
      
      doc.text(detail, margin + 2, currentY);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);

      currentY += 4;
      doc.line(margin, currentY - 1, width - margin, currentY - 1);
    });
    
    currentY += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`NETTO: ${totals.net.toFixed(2)}kg`, margin + 2, currentY);
    doc.text(`TARA: ${finalTotalTare.toFixed(2)}kg`, margin + 50, currentY);
    doc.text(`LORDO: ${finalGrossWeight.toFixed(2)}kg`, margin + 95, currentY);

    currentY = Math.max(currentY + 10, margin + 80);

    // --- SSCC GRANDE ---
    doc.setLineWidth(1);
    doc.rect(margin, currentY, width - 2 * margin, 25);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SSCC (Serial Shipping Container Code)', margin + 5, currentY + 8);
    doc.setFontSize(24);
    doc.text(currentSSCC, width / 2, currentY + 20, { align: 'center' });

    // --- SEZIONE INFERIORE: BARCODE ---
    const { gs1HumanReadable, gs1BarcodeText, hasMixedContent } = buildGs1Payload();

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`GS1 AI: ${gs1HumanReadable}`.substring(0, 95), margin, height - 58);
    if (hasMixedContent) {
      doc.setTextColor(180, 90, 0);
      doc.text('Nota: contenuto misto, alcuni AI opzionali non sono serializzabili in modo univoco.', margin, height - 54);
      doc.setTextColor(0, 0, 0);
    }

    try {
      const canvas = document.createElement('canvas');
      await bwipjs.toCanvas(canvas, {
        bcid: 'gs1-128',
        text: gs1BarcodeText,
        scale: 3,
        height: 32,
        includetext: true,
        textxalign: 'center',
      });

      const imgData = canvas.toDataURL('image/png');
      const barcodeWidth = width - 2 * margin;
      const barcodeHeight = 45;
      doc.addImage(imgData, 'PNG', margin, height - barcodeHeight - 10, barcodeWidth, barcodeHeight);
    } catch (e) {
      console.error('Errore generazione barcode:', e);
    }

    doc.save(`Etichetta_Pallet_${currentSSCC}.pdf`);
    
    saveToHistory(currentSSCC, lines, selectedRecipientCode, {
      net: totals.net.toFixed(2),
      gross: finalGrossWeight.toFixed(2),
      tare: finalTotalTare.toFixed(2)
    }, initialData?.id);
    if (!initialData) {
      setSerialNumber(prev => prev + 1);
    }
    if (onCancel) onCancel();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-end border-b border-black/10 pb-6">
        <div>
          <h2 className="text-4xl font-serif font-bold tracking-tight">
            {initialData ? 'Modifica Pedana' : 'Composizione Pedana'}
          </h2>
          <p className="text-sm text-black/40 font-medium">
            {initialData ? `Modificando SSCC: ${initialData.sscc}` : "Configura il contenuto e genera l'etichetta logistica"}
          </p>
        </div>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="rounded-xl">
            Annulla
          </Button>
        )}
      </header>

      {warning && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800 animate-pulse">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-bold">{warning}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recipient Selection */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold">Cliente Destinatario</h3>
          </div>
          <select 
            value={selectedRecipientCode}
            onChange={(e) => setSelectedRecipientCode(e.target.value)}
            className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Seleziona un cliente...</option>
            {recipients.map(r => (
              <option key={r.code} value={r.code}>{r.code} - {r.name}</option>
            ))}
          </select>
          {selectedRecipientCode && (
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
              <p className="text-xs font-bold text-indigo-900">{recipients.find(r => r.code === selectedRecipientCode)?.name}</p>
              <p className="text-[10px] text-indigo-700 mt-1">{recipients.find(r => r.code === selectedRecipientCode)?.address}</p>
            </div>
          )}
        </section>

        {/* Pallet Base Configuration REMOVED */}
      </div>

      <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-xl">Righe Pedana</h3>
          <button onClick={addLine} className="text-indigo-600 text-sm font-bold flex items-center gap-1 hover:underline">
            <Plus className="w-4 h-4" /> Aggiungi riga
          </button>
        </div>

        <div className="space-y-6">
          {lines.map((line, idx) => (
            <div key={line.id} className="p-6 bg-[#f9f9f9] rounded-3xl border border-black/5 relative group">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg">
                {idx + 1}
              </div>
              {lines.length > 1 && (
                <button 
                  onClick={() => removeLine(line.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <div className="space-y-6">
                {/* Gruppo 1: Prodotto */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Articolo</label>
                    <select 
                      value={line.articleCode}
                      onChange={(e) => updateLine(line.id, 'articleCode', e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Seleziona articolo...</option>
                      {articles.map(a => (
                        <option key={a.code} value={a.code}>{a.code} - {a.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Lotto</label>
                    <input 
                      type="text" 
                      value={line.batch}
                      onChange={(e) => updateLine(line.id, 'batch', e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm outline-none font-mono"
                      placeholder="Inserisci lotto..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-black/40 mb-1 block">Data Raccolta</label>
                    <input 
                      type="date" 
                      value={line.harvestDate}
                      onChange={(e) => updateLine(line.id, 'harvestDate', e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                {/* Gruppo 2: Confezionamento (Colli e Imballaggi Separati) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-2xl border border-black/5 shadow-inner">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-black/60">Quantità Colli</h4>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={line.count}
                        onChange={(e) => updateLine(line.id, 'count', e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-4 py-3 text-xl font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="0"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-black/30 uppercase">Unità</span>
                    </div>
                    <p className="text-[9px] text-black/40 italic">Inserisci il numero totale di colli (casse/cartoni) per questa riga.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-black/60">Tipo Imballaggio</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select 
                        value={line.packagingId}
                        onChange={(e) => updateLine(line.id, 'packagingId', e.target.value)}
                        className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Nessuno</option>
                        {packagings.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-black/30 uppercase">Tara Unit.</span>
                        <input 
                          type="number" 
                          value={line.packagingTare}
                          onChange={(e) => updateLine(line.id, 'packagingTare', e.target.value)}
                          className="w-full bg-[#f9f9f9] border border-black/10 rounded-xl pl-16 pr-3 py-2 text-sm outline-none font-mono"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-black/40 italic">La tara dell'imballaggio verrà moltiplicata per il numero di colli.</p>
                  </div>
                </div>
                
                {/* Gruppo 3: Pallets */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-black/60">Pallets Associati</h4>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {(line.pallets || []).length} Pallet{(line.pallets || []).length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(line.pallets || []).map(pallet => (
                      <div key={pallet._id} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-black/10 shadow-sm hover:border-indigo-200 transition-colors">
                        <div className="bg-indigo-50 p-2 rounded-xl">
                          <Truck className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{pallet.name}</p>
                          <p className="text-[10px] font-mono text-black/40">{pallet.tare} kg</p>
                        </div>
                        <button 
                          onClick={() => removePalletFromLine(line.id, pallet._id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="relative">
                       <select 
                          className="w-full bg-white border-2 border-dashed border-indigo-100 rounded-2xl px-4 py-3 text-xs outline-none text-indigo-600 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer appearance-none"
                          onChange={(e) => {
                            if (e.target.value) {
                              addPalletToLine(line.id, e.target.value);
                              e.target.value = ''; // Reset select
                            }
                          }}
                        >
                          <option value="">+ Aggiungi un altro Pallet...</option>
                          {palletMasters.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.tare}kg)</option>
                          ))}
                        </select>
                        <Plus className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                
                {/* Gruppo 4: Pesa */}
                <div className="pt-4 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6 w-full sm:w-auto">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-black/40">
                        {(articles.find(a => a.code === line.articleCode)?.weightType === 'FIXED' || articles.find(a => a.code === line.articleCode)?.um === 'PZ')
                          ? 'Peso Lordo Calcolato (kg)' 
                          : 'Peso Lordo Bilancia (kg)'}
                      </label>
                      <input 
                        type="number" 
                        value={line.grossWeight}
                        onChange={(e) => updateLine(line.id, 'grossWeight', e.target.value)}
                        readOnly={articles.find(a => a.code === line.articleCode)?.weightType === 'FIXED' || articles.find(a => a.code === line.articleCode)?.um === 'PZ'}
                        className={`w-full sm:w-40 border-2 rounded-2xl px-4 py-3 text-2xl font-mono font-bold outline-none shadow-sm ${
                          (articles.find(a => a.code === line.articleCode)?.weightType === 'FIXED' || articles.find(a => a.code === line.articleCode)?.um === 'PZ')
                            ? 'bg-gray-50 border-gray-200 text-gray-500'
                            : 'bg-white border-indigo-200 focus:border-indigo-500'
                        }`}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="h-12 w-px bg-black/10 hidden sm:block" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-black/40">Peso Netto</p>
                      <p className="text-3xl font-serif font-bold text-indigo-600">{line.netWeight} <span className="text-sm">kg</span></p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 bg-black/5 px-4 py-2 rounded-xl border border-black/5">
                    <p className="text-[9px] uppercase font-bold text-black/40">Tara Totale Riga</p>
                    <p className="text-sm font-bold text-black/60">
                      {((parseFloat(line.packagingTare || '0') * parseFloat(line.count || '0')) + (line.pallets || []).reduce((acc, p) => acc + parseFloat(p.tare || '0'), 0)).toFixed(2)} kg
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={addLine}
          className="w-full mt-6 py-4 border-2 border-dashed border-black/10 rounded-3xl text-black/40 font-bold flex items-center justify-center gap-2 hover:bg-black/5 hover:border-black/20 transition-all"
        >
          <Plus className="w-5 h-5" /> Aggiungi un'altra riga di prodotti
        </button>

        <div className="mt-10 pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 max-w-3xl">
            <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
              <p className="text-[9px] uppercase font-bold text-black/40">Totale Colli</p>
              <p className="text-2xl font-serif font-bold text-black">{(lines || []).reduce((acc, l) => acc + parseInt(l.count || '0'), 0)}</p>
            </div>
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <p className="text-[9px] uppercase font-bold text-indigo-400">Peso Netto</p>
              <p className="text-2xl font-serif font-bold text-indigo-900">{totals.net.toFixed(2)} <span className="text-xs">kg</span></p>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
              <p className="text-[9px] uppercase font-bold text-amber-400">Tara Totale</p>
              <p className="text-2xl font-serif font-bold text-amber-900">{finalTotalTare.toFixed(2)} <span className="text-xs">kg</span></p>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <p className="text-[9px] uppercase font-bold text-emerald-400">Peso Lordo</p>
              <p className="text-2xl font-serif font-bold text-emerald-900">{finalGrossWeight.toFixed(2)} <span className="text-xs">kg</span></p>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="bg-white p-4 rounded-2xl border border-black/5 mb-2">
              <p className="text-[10px] uppercase font-bold text-black/40 mb-1">SSCC Assegnato</p>
              <p className="font-mono text-xl font-bold text-emerald-600">{currentSSCC}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Payload GS1 previsto</p>
              <p className="font-mono text-xs text-slate-700 break-all">{buildGs1Payload().gs1HumanReadable}</p>
            </div>
            <Button 
              onClick={generatePDF}
              className="h-16 text-lg shadow-xl shadow-indigo-200"
              disabled={!selectedRecipientCode || lines.length === 0}
            >
              {initialData ? 'Salva Modifiche' : 'Genera Etichetta & Salva'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
