import React, { useState } from 'react';
import { MasterPackaging } from '../types';
import { MasterDataLayout } from '../components/master-data/MasterDataLayout';
import { MasterDataTable, Column } from '../components/master-data/MasterDataTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { X } from 'lucide-react';

interface PackagingsPageProps {
  packagings: MasterPackaging[];
  onSave: (packaging: MasterPackaging) => void;
  onDelete: (packaging: MasterPackaging) => void;
}

export const PackagingsPage: React.FC<PackagingsPageProps> = ({
  packagings,
  onSave,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<MasterPackaging | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = () => {
    setEditingPackaging(null);
    setIsModalOpen(true);
  };

  const handleEdit = (packaging: MasterPackaging) => {
    setEditingPackaging(packaging);
    setIsModalOpen(true);
  };

  const handleDelete = (packaging: MasterPackaging) => {
    if (confirm(`Sei sicuro di voler eliminare l'imballaggio ${packaging.name}?`)) {
      onDelete(packaging);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newPackaging: MasterPackaging = {
      id: editingPackaging?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      tare: formData.get('tare') as string,
      isPooling: formData.get('isPooling') === 'on',
      width: formData.get('width') as string,
      depth: formData.get('depth') as string,
      height: formData.get('height') as string,
      material: formData.get('material') as string,
    };

    onSave(newPackaging);
    setIsModalOpen(false);
  };

  const filteredPackagings = packagings.filter(pkg => 
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<MasterPackaging>[] = [
    { header: 'Nome', accessor: 'name', className: 'font-medium' },
    { header: 'Tara (kg)', accessor: 'tare' },
    { 
      header: 'Tipo', 
      accessor: (item) => item.isPooling ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Pooling (CPR/IFCO)
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          A Perdere
        </span>
      )
    },
  ];

  return (
    <MasterDataLayout
      title="Anagrafica Imballaggi"
      onAdd={handleAdd}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      addButtonLabel="Nuovo Imballaggio"
    >
      <MasterDataTable
        columns={columns}
        data={filteredPackagings}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-serif font-bold">
                {editingPackaging ? 'Modifica Imballaggio' : 'Nuovo Imballaggio'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Imballaggio</label>
                  <Input name="name" defaultValue={editingPackaging?.name} required placeholder="Es. Cartone 40x60" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tara (kg)</label>
                    <Input name="tare" type="number" step="0.01" defaultValue={editingPackaging?.tare} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Materiale</label>
                    <Input name="material" defaultValue={editingPackaging?.material} placeholder="Es. Cartone" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensioni (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input name="width" type="number" defaultValue={editingPackaging?.width} placeholder="Largh." />
                    <Input name="depth" type="number" defaultValue={editingPackaging?.depth} placeholder="Prof." />
                    <Input name="height" type="number" defaultValue={editingPackaging?.height} placeholder="Alt." />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    name="isPooling" 
                    id="isPooling" 
                    defaultChecked={editingPackaging?.isPooling}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="isPooling" className="text-sm font-medium text-gray-700">Imballaggio a rendere (Pooling)</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
                <Button type="submit">Salva Imballaggio</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MasterDataLayout>
  );
};
