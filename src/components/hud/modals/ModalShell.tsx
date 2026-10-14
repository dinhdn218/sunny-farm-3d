'use client';

import { ReactNode } from 'react';
import { useGameStore } from '@/store/useGameStore';

// Parchment modal frame shared by every dialog (icon + title header, red close button)
export function ModalShell({
  icon,
  title,
  subtitle,
  maxWidth = 'max-w-2xl',
  headerRight,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  maxWidth?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  const setActiveModal = useGameStore((s) => s.setActiveModal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`parchment-panel relative flex max-h-[90vh] w-full flex-col rounded-3xl p-5 sm:p-6 ${maxWidth}`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-700/30 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <h2 className="text-xl font-black text-amber-950 sm:text-2xl">{title}</h2>
              <p className="text-xs font-bold text-amber-800">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={() => setActiveModal(null)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-lg font-black text-white shadow hover:bg-red-500"
            >
              ✕
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
