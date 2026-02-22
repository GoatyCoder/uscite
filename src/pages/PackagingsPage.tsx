import React, { useState } from 'react';
import { MasterPackaging } from '../types';
import { MasterDataLayout } from '../components/master-data/MasterDataLayout';
import { MasterDataTable, Column } from '../components/master-data/MasterDataTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { X } from 'lucide-react';

interface PackagingsPageProps {
  packagings: MasterPackaging[];
  onSave: (packaging: MasterPackaging) => void;
  onDelete: (packaging: MasterPackaging) => void;
}

const parseOptionalNumber = (value: FormDataEntryValue | null): number | undefined => {
  const parsed = parseFloat((value as string) || '');
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const PackagingsPage: React.FC<PackagingsPageProps> = ({
  packagings,
  onSave,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<MasterPackaging | null>(null);
  const [packagingToDelete, setPackagingToDelete] = useState<MasterPackaging | null>(null);
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
    setPackagingToDelete(packaging);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newPackaging: MasterPackaging = {
      id: editingPackaging?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      tare: parseFloat(formData.get('tare') as string),
      width: parseOptionalNumber(formData.get('width')),
      depth: parseOptionalNumber(formData.get('depth')),
      height: parseOptionalNumber(formData.get('height')),
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
      header: 'Dimensioni (mm)',
      accessor: (item) => `${item.width || '-'} × ${item.depth || '-'} × ${item.height || '-'}`,
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
                  <Input name="name" defaultValue={editingPackaging?.name} required placeholder="Es. Cassa 40x60" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tara (kg)</label>
                  <Input name="tare" type="number" step="0.01" defaultValue={editingPackaging?.tare} required placeholder="0.00" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensioni (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input name="width" type="number" defaultValue={editingPackaging?.width} placeholder="Largh." />
                    <Input name="depth" type="number" defaultValue={editingPackaging?.depth} placeholder="Prof." />
                    <Input name="height" type="number" defaultValue={editingPackaging?.height} placeholder="Alt." />
                  </div>
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

      <ConfirmDialog
        isOpen={!!packagingToDelete}
        title="Conferma eliminazione imballaggio"
        message={`Vuoi davvero eliminare l'imballaggio ${packagingToDelete?.name || ''}? Questa operazione non è reversibile.`}
        confirmLabel="Elimina imballaggio"
        variant="danger"
        onCancel={() => setPackagingToDelete(null)}
        onConfirm={() => {
          if (packagingToDelete) {
            onDelete(packagingToDelete);
            setPackagingToDelete(null);
          }
        }}
      />
    </MasterDataLayout>
  );
};
