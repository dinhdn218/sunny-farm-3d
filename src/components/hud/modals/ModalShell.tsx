'use client';

import { ReactNode } from 'react';
import { useGameStore } from '@/store/useGameStore';

// Parchment modal frame shared by every dialog (icon + title header, red close button). On phones the frame
// hugs the screen and the header is tighter: the close button sits in the corner instead of taking a row.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4">
      <div
        className={`parchment-panel relative flex max-h-[90vh] w-full flex-col rounded-3xl p-3.5 max-sm:max-h-[94dvh] sm:p-6 ${maxWidth}`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-700/30 pb-2.5 max-sm:pr-10 sm:mb-4 sm:pb-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-2xl sm:text-3xl">{icon}</span>
            <div>
              <h2 className="text-lg font-black leading-tight text-amber-950 sm:text-2xl">{title}</h2>
              <p className="text-[11px] font-bold leading-snug text-amber-800 sm:text-xs">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={() => setActiveModal(null)}
              aria-label="Đóng"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-lg font-black text-white shadow hover:bg-red-500 max-sm:absolute max-sm:right-3 max-sm:top-3 max-sm:h-8 max-sm:w-8 max-sm:text-base"
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
