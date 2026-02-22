import React, { useMemo, useState } from 'react';
import { MasterArticle, MasterPackaging } from '../types';
import { MasterDataLayout } from '../components/master-data/MasterDataLayout';
import { MasterDataTable, Column } from '../components/master-data/MasterDataTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ArticlesPageProps {
  articles: MasterArticle[];
  packagings: MasterPackaging[];
  onSave: (article: MasterArticle) => void;
  onDelete: (article: MasterArticle) => void;
}

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

const computeGs1CheckDigit = (codeWithoutCheckDigit: string): number => {
  const reversed = codeWithoutCheckDigit.split('').reverse();
  const sum = reversed.reduce((acc, char, idx) => {
    const num = parseInt(char, 10);
    return acc + (idx % 2 === 0 ? num * 3 : num);
  }, 0);
  return (10 - (sum % 10)) % 10;
};

const normalizeToGtin14 = (raw: string): string | null => {
  const digits = normalizeDigits(raw);
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  const base = digits.slice(0, -1);
  const check = parseInt(digits[digits.length - 1], 10);
  const expected = computeGs1CheckDigit(base);
  if (check !== expected) return null;
  return digits.padStart(14, '0');
};

export const ArticlesPage: React.FC<ArticlesPageProps> = ({
  articles,
  packagings,
  onSave,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<MasterArticle | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<MasterArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingArticle(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleEdit = (article: MasterArticle) => {
    setEditingArticle(article);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleDelete = (article: MasterArticle) => {
    setArticleToDelete(article);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const gtinRaw = (formData.get('gtin') as string) || '';
    const normalizedGtin14 = normalizeToGtin14(gtinRaw);
    if (!normalizedGtin14) {
      setFormError('GTIN non valido: usa 8/12/13/14 cifre con check digit corretto.');
      return;
    }

    const originRaw = ((formData.get('origin') as string) || '').trim().toUpperCase();
    const isOriginValid = /^[A-Z]{2}$/.test(originRaw) || /^\d{3}$/.test(originRaw);
    if (!isOriginValid) {
      setFormError('Origine non valida: usare ISO alpha-2 (es. IT) oppure codice numerico a 3 cifre (es. 380).');
      return;
    }

    const weightType = formData.get('weightType') as 'FIXED' | 'VARIABLE';
    const unitWeight = ((formData.get('unitWeight') as string) || '0').trim();
    if (weightType === 'FIXED' && (!unitWeight || parseFloat(unitWeight) <= 0)) {
      setFormError('Per articoli a peso fisso il peso unitario deve essere maggiore di zero.');
      return;
    }

    const newArticle: MasterArticle = {
      code: ((formData.get('code') as string) || '').trim(),
      description: ((formData.get('description') as string) || '').trim(),
      gtin: normalizedGtin14,
      origin: originRaw,
      um: formData.get('um') as 'KG' | 'PZ',
      unitWeight,
      weightType,
      defaultPackagingId: (formData.get('defaultPackagingId') as string) || '',
      requiresLot: formData.get('requiresLot') === 'on',
      requiresHarvestDate: formData.get('requiresHarvestDate') === 'on',
      netWeightAi: (formData.get('netWeightAi') as '3102' | 'NONE') || '3102',
    };

    if (!newArticle.code || !newArticle.description) {
      setFormError('Codice e descrizione sono obbligatori.');
      return;
    }

    setFormError(null);
    onSave(newArticle);
    setIsModalOpen(false);
  };

  const filteredArticles = useMemo(() => (
    articles.filter(article =>
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.gtin.includes(searchQuery)
    )
  ), [articles, searchQuery]);

  const columns: Column<MasterArticle>[] = [
    { header: 'Codice', accessor: 'code', className: 'font-mono text-xs' },
    { header: 'Descrizione', accessor: 'description', className: 'font-medium' },
    { header: 'GTIN-14', accessor: 'gtin', className: 'font-mono text-xs text-gray-500' },
    { header: 'Origine', accessor: 'origin' },
    {
      header: 'Profilo GS1',
      accessor: (item) => {
        const lot = item.requiresLot ? 'lotto' : 'lotto opz.';
        const harv = item.requiresHarvestDate ? 'raccolta obbl.' : 'raccolta opz.';
        return `${lot} · ${harv}`;
      }
    },
    {
      header: 'Peso',
      accessor: (item) => item.weightType === 'FIXED' ? `${item.unitWeight} kg` : 'Variabile'
    },
    {
      header: 'Imballo Default',
      accessor: (item) => packagings.find(p => p.id === item.defaultPackagingId)?.name || '-'
    },
  ];

  return (
    <MasterDataLayout
      title="Anagrafica Articoli (GS1)"
      onAdd={handleAdd}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      addButtonLabel="Nuovo Articolo"
    >
      <MasterDataTable
        columns={columns}
        data={filteredArticles}
        onEdit={handleEdit}
        onDelete={handleDelete}
        keyField="code"
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-serif font-bold">
                {editingArticle ? 'Modifica Articolo (GS1 strict)' : 'Nuovo Articolo (GS1 strict)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <section className="space-y-3 border border-gray-100 rounded-lg p-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600">Identità articolo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Codice Interno</label>
                    <Input name="code" defaultValue={editingArticle?.code} required placeholder="Es. ART01" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</label>
                    <Input name="description" defaultValue={editingArticle?.description} required placeholder="Es. Mele Gala" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">GTIN (8/12/13/14 cifre)</label>
                    <Input name="gtin" defaultValue={editingArticle?.gtin} required placeholder="Es. 8012345000012" maxLength={14} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Origine</label>
                    <Input name="origin" defaultValue={editingArticle?.origin} required placeholder="Es. IT oppure 380" maxLength={3} />
                  </div>
                </div>
              </section>

              <section className="space-y-3 border border-gray-100 rounded-lg p-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600">Misura e peso</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unità di Misura</label>
                    <select name="um" defaultValue={editingArticle?.um || 'KG'} className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                      <option value="KG">Chilogrammi (KG)</option>
                      <option value="PZ">Pezzi (PZ)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Peso</label>
                    <select name="weightType" defaultValue={editingArticle?.weightType || 'VARIABLE'} className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                      <option value="VARIABLE">Variabile (da bilancia)</option>
                      <option value="FIXED">Fisso (predefinito)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Unitario (kg)</label>
                    <Input name="unitWeight" type="number" step="0.01" defaultValue={editingArticle?.unitWeight || '0'} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">AI peso netto</label>
                    <select name="netWeightAi" defaultValue={editingArticle?.netWeightAi || '3102'} className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                      <option value="3102">3102 (kg, 2 decimali)</option>
                      <option value="NONE">Nessun AI peso</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-3 border border-gray-100 rounded-lg p-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600">Tracciabilità GS1</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" name="requiresLot" defaultChecked={editingArticle?.requiresLot ?? true} />
                    Lotto obbligatorio (AI 10)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" name="requiresHarvestDate" defaultChecked={editingArticle?.requiresHarvestDate ?? false} />
                    Data raccolta obbligatoria (AI 7007)
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Configurazione richiesta: per ora la data raccolta resta opzionale di default.
                </p>
              </section>

              <section className="space-y-2 border border-gray-100 rounded-lg p-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-gray-600">Imballaggio</h4>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Imballaggio Default</label>
                  <select name="defaultPackagingId" defaultValue={editingArticle?.defaultPackagingId} className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                    <option value="">Seleziona...</option>
                    {packagings.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </section>

              {formError ? (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{formError}</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mt-0.5" />
                  <span>Validazione strict GS1 attiva: il salvataggio viene bloccato sui campi non conformi.</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
                <Button type="submit">Salva Articolo</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!articleToDelete}
        title="Conferma eliminazione articolo"
        message={`Vuoi davvero eliminare l'articolo ${articleToDelete?.description || ''}? Questa operazione non è reversibile.`}
        confirmLabel="Elimina articolo"
        variant="danger"
        onCancel={() => setArticleToDelete(null)}
        onConfirm={() => {
          if (articleToDelete) {
            onDelete(articleToDelete);
            setArticleToDelete(null);
          }
        }}
      />
    </MasterDataLayout>
  );
};
