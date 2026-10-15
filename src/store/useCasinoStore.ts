'use client';

import { create } from 'zustand';
import { TableId, TableState } from '@/lib/casino';

// Casino tables as last heard over the network (not saved; see lib/casinoNet)
interface CasinoState {
  tables: Partial<Record<TableId, TableState>>;
  // When each table's host was last heard from
  heard: Partial<Record<TableId, number>>;
  // The table window that is open, sitting or watching
  open: TableId | null;
  setTable: (table: TableState) => void;
  heardFrom: (id: TableId) => void;
  dropTable: (id: TableId) => void;
  setOpen: (id: TableId | null) => void;
  reset: () => void;
}

export const useCasinoStore = create<CasinoState>()((set) => ({
  tables: {},
  heard: {},
  open: null,
  setTable: (table) =>
    set((s) => ({
      tables: { ...s.tables, [table.id]: table },
      heard: { ...s.heard, [table.id]: Date.now() },
    })),
  heardFrom: (id) => set((s) => ({ heard: { ...s.heard, [id]: Date.now() } })),
  dropTable: (id) =>
    set((s) => {
      const tables = { ...s.tables };
      delete tables[id];
      return { tables, open: s.open === id ? null : s.open };
    }),
  setOpen: (open) => set({ open }),
  reset: () => set({ tables: {}, heard: {}, open: null }),
}));
