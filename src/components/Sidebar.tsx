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
  Settings,
  ChevronRight,
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
    <aside className="w-full md:w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-5 lg:p-6 flex flex-col gap-6 shrink-0 border-r border-white/10 shadow-2xl">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">AgroGestionale</h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mt-1 font-semibold">GS1 Label Platform</p>
      </div>

      <nav className="flex-1 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewMode)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-300/30 shadow-lg'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon className={clsx('w-4.5 h-4.5', isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200')} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-cyan-300" />}
            </button>
          );
        })}
      </nav>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400">
        <p className="font-semibold text-slate-200">Versione 3.0.0</p>
        <p className="mt-1">© 2026 AgroSystem Enterprise</p>
      </div>
    </aside>
  );
};
