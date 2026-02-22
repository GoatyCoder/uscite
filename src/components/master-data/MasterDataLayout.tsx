import React from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface MasterDataLayoutProps {
  title: string;
  onAdd: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  children: React.ReactNode;
  addButtonLabel?: string;
}

export const MasterDataLayout: React.FC<MasterDataLayoutProps> = ({
  title,
  onAdd,
  searchQuery,
  onSearchChange,
  children,
  addButtonLabel = 'Aggiungi Nuovo',
}) => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#1a1a1a]">{title}</h2>
          <p className="text-gray-500 mt-1">Gestione anagrafica e configurazioni</p>
        </div>
        <Button onClick={onAdd} className="bg-[#1a1a1a] text-white px-6 py-2 rounded-lg hover:bg-black/90 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {addButtonLabel}
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#1a1a1a]/5 overflow-hidden">
        <div className="p-4 border-b border-[#1a1a1a]/5 bg-gray-50/50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Cerca..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
