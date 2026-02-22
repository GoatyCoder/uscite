import React, { useState } from 'react';
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../ui/Button';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  sortable?: boolean;
}

interface MasterDataTableProps<T extends { id?: string; code?: string }> {
  columns: Column<T>[];
  data: T[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  keyField?: keyof T;
}

type SortDirection = 'asc' | 'desc' | null;

export function MasterDataTable<T extends { id?: string; code?: string }>({
  columns,
  data,
  onEdit,
  onDelete,
  keyField = 'id' as keyof T,
}: MasterDataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof T | null; direction: SortDirection }>({
    key: null,
    direction: null,
  });

  const handleSort = (column: Column<T>) => {
    if (!column.sortable || typeof column.accessor === 'function') return;

    const key = column.accessor as keyof T;
    let direction: SortDirection = 'asc';

    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }

    setSortConfig({ key: direction ? key : null, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  if (data.length === 0) {
    return <div className="p-12 text-center text-slate-500">Nessun dato trovato.</div>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          {columns.map((col, idx) => (
            <th
              key={idx}
              className={`px-6 py-4 text-left font-semibold text-slate-500 uppercase tracking-wider text-xs ${col.className || ''} ${col.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}
              onClick={() => handleSort(col)}
            >
              <div className="flex items-center gap-2">
                {col.header}
                {col.sortable && typeof col.accessor !== 'function' && (
                  <span className="text-slate-400">
                    {sortConfig.key === col.accessor ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </span>
                )}
              </div>
            </th>
          ))}
          <th className="px-6 py-4 text-right font-semibold text-slate-500 uppercase tracking-wider text-xs w-24">Azioni</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {sortedData.map((item, rowIdx) => (
          <tr key={String(item[keyField]) || rowIdx} className="hover:bg-slate-50/80 transition-colors">
            {columns.map((col, colIdx) => (
              <td key={colIdx} className={`px-6 py-4 text-slate-800 ${col.className || ''}`}>
                {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as React.ReactNode)}
              </td>
            ))}
            <td className="px-6 py-4 text-right">
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8 text-slate-400 hover:text-slate-700">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(item)}
                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
