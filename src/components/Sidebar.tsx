import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Tag, 
  Package, 
  Layers, 
  Users, 
  History, 
  FileText, 
  Settings 
} from 'lucide-react';
import { ViewMode } from '../types';
import { clsx } from 'clsx';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const menuItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'PALLET', label: 'Nuovo Pallet', icon: PlusCircle },
    { id: 'ARTICOLI', label: 'Anagrafica Articoli', icon: Tag },
    { id: 'IMBALLAGGI', label: 'Anagrafica Imballaggi', icon: Package },
    { id: 'PALLET_MASTER', label: 'Anagrafica Pallet', icon: Layers },
    { id: 'CLIENTI', label: 'Clienti', icon: Users },
    { id: 'STORICO', label: 'Storico Pallet', icon: History },
    { id: 'DDT', label: 'Gestione DDT', icon: FileText },
    { id: 'IMPOSTAZIONI', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <aside className="w-full md:w-64 bg-[#1a1a1a] text-white p-6 flex flex-col gap-8 shrink-0">
      <div className="mb-4">
        <h1 className="text-2xl font-serif font-bold leading-tight">AgroGestionale</h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">GS1 Label System</p>
      </div>
      
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewMode)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'bg-white text-[#1a1a1a] shadow-lg translate-x-1' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={clsx("w-5 h-5", isActive ? "text-[#1a1a1a]" : "text-gray-500")} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-white/10">
        <div className="text-xs text-gray-500">
          <p>Versione 2.0.0</p>
          <p className="mt-1">© 2024 AgroSystem</p>
        </div>
      </div>
    </aside>
  );
};
