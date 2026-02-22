import React, { useState } from 'react';
import { MasterRecipient } from '../types';
import { MasterDataLayout } from '../components/master-data/MasterDataLayout';
import { MasterDataTable, Column } from '../components/master-data/MasterDataTable';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { X } from 'lucide-react';

interface RecipientsPageProps {
  recipients: MasterRecipient[];
  onSave: (recipient: MasterRecipient) => void;
  onDelete: (recipient: MasterRecipient) => void;
}

export const RecipientsPage: React.FC<RecipientsPageProps> = ({
  recipients,
  onSave,
  onDelete,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<MasterRecipient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = () => {
    setEditingRecipient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (recipient: MasterRecipient) => {
    setEditingRecipient(recipient);
    setIsModalOpen(true);
  };

  const handleDelete = (recipient: MasterRecipient) => {
    if (confirm(`Sei sicuro di voler eliminare il cliente ${recipient.name}?`)) {
      onDelete(recipient);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newRecipient: MasterRecipient = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      vatNumber: formData.get('vatNumber') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    };

    onSave(newRecipient);
    setIsModalOpen(false);
  };

  const filteredRecipients = recipients.filter(recipient => 
    recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipient.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<MasterRecipient>[] = [
    { header: 'Codice', accessor: 'code', className: 'font-mono text-xs' },
    { header: 'Ragione Sociale', accessor: 'name', className: 'font-medium' },
    { header: 'Indirizzo', accessor: 'address', className: 'text-xs text-gray-500' },
    { header: 'P.IVA', accessor: 'vatNumber', className: 'font-mono text-xs' },
    { header: 'Email', accessor: 'email', className: 'text-xs' },
    { header: 'Telefono', accessor: 'phone', className: 'text-xs' },
  ];

  return (
    <MasterDataLayout
      title="Anagrafica Clienti"
      onAdd={handleAdd}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      addButtonLabel="Nuovo Cliente"
    >
      <MasterDataTable
        columns={columns}
        data={filteredRecipients}
        onEdit={handleEdit}
        onDelete={handleDelete}
        keyField="code"
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-serif font-bold">
                {editingRecipient ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Codice Cliente</label>
                  <Input name="code" defaultValue={editingRecipient?.code} required placeholder="Es. CL001" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ragione Sociale</label>
                  <Input name="name" defaultValue={editingRecipient?.name} required placeholder="Es. Mario Rossi Srl" />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Indirizzo Completo</label>
                  <Input name="address" defaultValue={editingRecipient?.address} required placeholder="Via Roma 1, 00100 Roma (RM)" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Partita IVA / C.F.</label>
                  <Input name="vatNumber" defaultValue={editingRecipient?.vatNumber} placeholder="IT12345678901" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Telefono</label>
                  <Input name="phone" defaultValue={editingRecipient?.phone} placeholder="+39 0123 456789" />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email / PEC</label>
                  <Input name="email" type="email" defaultValue={editingRecipient?.email} placeholder="amministrazione@cliente.it" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annulla</Button>
                <Button type="submit">Salva Cliente</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MasterDataLayout>
  );
};
