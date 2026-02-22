import React, { useState } from 'react';
import { MasterArticle, MasterPackaging } from '../types';
import { MasterDataLayout } from '../components/master-data/MasterDataLayout';
import { MasterDataTable, Column } from '../components/master-data/MasterDataTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { X } from 'lucide-react';

interface ArticlesPageProps {
  articles: MasterArticle[];
  packagings: MasterPackaging[];
  onSave: (article: MasterArticle) => void;
  onDelete: (article: MasterArticle) => void;
}

export const ArticlesPage: React.FC<ArticlesPageProps> = ({
  articles,
  packagings,
  onSave,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<MasterArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = () => {
    setEditingArticle(null);
    setIsModalOpen(true);
  };

  const handleEdit = (article: MasterArticle) => {
    setEditingArticle(article);
    setIsModalOpen(true);
  };

  const handleDelete = (article: MasterArticle) => {
    if (confirm(`Sei sicuro di voler eliminare l'articolo ${article.description}?`)) {
      onDelete(article);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const saleType = formData.get('saleType') as MasterArticle['saleType'];
    const unitsPerCase = (formData.get('unitsPerCase') as string) || '1';
    const netWeightPerUnitKg = (formData.get('netWeightPerUnitKg') as string) || '0';
    const netWeightPerCaseKgInput = (formData.get('netWeightPerCaseKg') as string) || '0';

    const inferredWeightType = saleType === 'KG_VARIABLE' ? 'VARIABLE' : 'FIXED';
    const inferredUm = saleType === 'PZ' ? 'PZ' : 'KG';
    const parsedUnitsPerCase = Math.max(1, parseFloat(unitsPerCase.replace(',', '.')) || 1);
    const parsedNetWeightUnit = Math.max(0, parseFloat(netWeightPerUnitKg.replace(',', '.')) || 0);
    const computedCaseWeight = parsedUnitsPerCase * parsedNetWeightUnit;
    const parsedCaseWeightInput = Math.max(0, parseFloat(netWeightPerCaseKgInput.replace(',', '.')) || 0);
    const netWeightPerCaseKg = parsedCaseWeightInput > 0 ? parsedCaseWeightInput : computedCaseWeight;

    const newArticle: MasterArticle = {
      code: formData.get('code') as string,
      description: formData.get('description') as string,
      gtin: formData.get('gtin') as string,
      origin: formData.get('origin') as string,
      um: inferredUm,
      saleType,
      unitWeight: netWeightPerCaseKg.toFixed(3),
      weightType: inferredWeightType,
      unitsPerCase: parsedUnitsPerCase.toString(),
      netWeightPerUnitKg: parsedNetWeightUnit.toFixed(3),
      netWeightPerCaseKg: netWeightPerCaseKg.toFixed(3),
      defaultPackagingId: formData.get('defaultPackagingId') as string,
    };

    onSave(newArticle);
    setIsModalOpen(false);
  };

  const filteredArticles = articles.filter(article => 
    article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.gtin.includes(searchQuery)
  );

  const columns: Column<MasterArticle>[] = [
    { header: 'Codice', accessor: 'code', className: 'font-mono text-xs' },
    { header: 'Descrizione', accessor: 'description', className: 'font-medium' },
    { header: 'GTIN', accessor: 'gtin', className: 'font-mono text-xs text-gray-500' },
    { header: 'Origine', accessor: 'origin' },
    { header: 'Tipologia', accessor: (item) => item.saleType || (item.um === 'PZ' ? 'PZ' : item.weightType === 'VARIABLE' ? 'KG_VARIABLE' : 'KG_FIXED') },
    { 
      header: 'Configurazione', 
      accessor: (item) => {
        if ((item.saleType || '') === 'PZ') {
          return `${item.unitsPerCase || '1'} x ${item.netWeightPerUnitKg || '0.000'} kg`;
        }
        return item.weightType === 'FIXED' ? `${item.netWeightPerCaseKg || item.unitWeight} kg/collo` : 'Peso variabile da bilancia';
      }
    },
    { 
      header: 'Imballo Default', 
      accessor: (item) => packagings.find(p => p.id === item.defaultPackagingId)?.name || '-' 
    },
  ];

  return (
    <MasterDataLayout
      title="Anagrafica Articoli"
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-serif font-bold">
                {editingArticle ? 'Modifica Articolo' : 'Nuovo Articolo'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
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
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">GTIN (EAN-13)</label>
                  <Input name="gtin" defaultValue={editingArticle?.gtin} required placeholder="8012345..." maxLength={14} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Origine (Codice ISO)</label>
                  <Input name="origin" defaultValue={editingArticle?.origin} required placeholder="Es. 380 (Italia)" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipologia Vendita (GS1)</label>
                  <select name="saleType" defaultValue={editingArticle?.saleType || (editingArticle?.um === 'PZ' ? 'PZ' : editingArticle?.weightType === 'VARIABLE' ? 'KG_VARIABLE' : 'KG_FIXED')} className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                    <option value="KG_VARIABLE">Articolo a peso variabile (KG)</option>
                    <option value="KG_FIXED">Articolo a peso fisso (KG)</option>
                    <option value="PZ">Articolo venduto a pezzi (PZ)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Unità per Collo</label>
                  <Input name="unitsPerCase" type="number" step="1" defaultValue={editingArticle?.unitsPerCase || '1'} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Netto per Unità (kg)</label>
                  <Input name="netWeightPerUnitKg" type="number" step="0.001" defaultValue={editingArticle?.netWeightPerUnitKg || '0'} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Netto per Collo (kg)</label>
                  <Input name="netWeightPerCaseKg" type="number" step="0.001" defaultValue={editingArticle?.netWeightPerCaseKg || editingArticle?.unitWeight || '0'} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Imballaggio Default</label>
                  <select name="defaultPackagingId" defaultValue={editingArticle?.defaultPackagingId} className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                    <option value="">Seleziona...</option>
                    {packagings.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
                <Button type="submit">Salva Articolo</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MasterDataLayout>
  );
};
