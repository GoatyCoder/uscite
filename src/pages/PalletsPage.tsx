import React, { useState } from 'react';
import { MasterPallet } from '../types';
import { MasterDataLayout } from '../components/master-data/MasterDataLayout';
import { MasterDataTable, Column } from '../components/master-data/MasterDataTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { X } from 'lucide-react';

interface PalletsPageProps {
  pallets: MasterPallet[];
  onSave: (pallet: MasterPallet) => void;
  onDelete: (pallet: MasterPallet) => void;
}

export const PalletsPage: React.FC<PalletsPageProps> = ({
  pallets,
  onSave,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPallet, setEditingPallet] = useState<MasterPallet | null>(null);
  const [palletToDelete, setPalletToDelete] = useState<MasterPallet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = () => {
    setEditingPallet(null);
    setIsModalOpen(true);
  };

  const handleEdit = (pallet: MasterPallet) => {
    setEditingPallet(pallet);
    setIsModalOpen(true);
  };

  const handleDelete = (pallet: MasterPallet) => {
    setPalletToDelete(pallet);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newPallet: MasterPallet = {
      id: editingPallet?.id || crypto.randomUUID(),
      name: formData.get('name') as string,
      tare: formData.get('tare') as string,
      isPooling: formData.get('isPooling') === 'on',
      width: formData.get('width') as string,
      depth: formData.get('depth') as string,
      height: formData.get('height') as string,
      maxLoad: formData.get('maxLoad') as string,
      material: formData.get('material') as string,
    };

    onSave(newPallet);
    setIsModalOpen(false);
  };

  const filteredPallets = pallets.filter(pallet => 
    pallet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<MasterPallet>[] = [
    { header: 'Nome', accessor: 'name', className: 'font-medium' },
    { header: 'Tara (kg)', accessor: 'tare' },
    { header: 'Portata Max (kg)', accessor: (item) => item.maxLoad || '-' },
    {
      header: 'Dimensioni (mm)',
      accessor: (item) => `${item.width || '-'} × ${item.depth || '-'} × ${item.height || '-'}`,
    },
    {
      header: 'Tipo',
      accessor: (item) => item.isPooling ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Pooling (EPAL/CHEP)
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
      title="Anagrafica Pallet"
      onAdd={handleAdd}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      addButtonLabel="Nuovo Pallet"
    >
      <MasterDataTable
        columns={columns}
        data={filteredPallets}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-serif font-bold">
                {editingPallet ? 'Modifica Pallet' : 'Nuovo Pallet'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Pallet</label>
                  <Input name="name" defaultValue={editingPallet?.name} required placeholder="Es. EPAL (80x120)" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tara (kg)</label>
                    <Input name="tare" type="number" step="0.01" defaultValue={editingPallet?.tare} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Portata Max (kg)</label>
                    <Input name="maxLoad" type="number" defaultValue={editingPallet?.maxLoad} placeholder="Es. 1500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Materiale</label>
                  <Input name="material" defaultValue={editingPallet?.material} placeholder="Es. Legno" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensioni (mm)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input name="width" type="number" defaultValue={editingPallet?.width} placeholder="Largh." />
                    <Input name="depth" type="number" defaultValue={editingPallet?.depth} placeholder="Prof." />
                    <Input name="height" type="number" defaultValue={editingPallet?.height} placeholder="Alt." />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    name="isPooling" 
                    id="isPooling" 
                    defaultChecked={editingPallet?.isPooling}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="isPooling" className="text-sm font-medium text-gray-700">Pallet a rendere (Pooling)</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
                <Button type="submit">Salva Pallet</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!palletToDelete}
        title="Conferma eliminazione pallet"
        message={`Vuoi davvero eliminare il pallet ${palletToDelete?.name || ''}? Questa operazione non è reversibile.`}
        confirmLabel="Elimina pallet"
        variant="danger"
        onCancel={() => setPalletToDelete(null)}
        onConfirm={() => {
          if (palletToDelete) {
            onDelete(palletToDelete);
            setPalletToDelete(null);
          }
        }}
      />
    </MasterDataLayout>
  );
};
