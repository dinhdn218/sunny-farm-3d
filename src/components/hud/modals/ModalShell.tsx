'use client';

import { MouseEvent, PointerEvent, ReactNode, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';

// Props for a dimmed backdrop that closes its window when tapped or clicked. Only a press that starts and ends
// on the backdrop itself counts, so dragging out of the window (selecting text, scrolling a list) never closes it.
export function useBackdropDismiss(onDismiss: () => void) {
  const pressed = useRef(false);
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      pressed.current = e.target === e.currentTarget;
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (pressed.current && e.target === e.currentTarget) onDismiss();
      pressed.current = false;
    },
  };
}

// The red ✕ in a window's top-right corner (its frame must be `relative`)
export function CloseButton({ onClick, label = 'Đóng' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-red-600 text-base font-black text-white shadow hover:bg-red-500 sm:right-5 sm:top-5 sm:h-9 sm:w-9 sm:text-lg"
    >
      ✕
    </button>
  );
}

// Parchment modal frame shared by every dialog (icon + title header). The close button always sits in the top-right
// corner, and a tap or click on the dimmed backdrop closes the window too. On phones the frame hugs the screen.
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
  const close = () => setActiveModal(null);
  const backdrop = useBackdropDismiss(close);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4"
      {...backdrop}
    >
      <div
        className={`parchment-panel relative flex max-h-[90vh] w-full flex-col rounded-3xl p-3.5 max-sm:max-h-[94dvh] sm:p-6 ${maxWidth}`}
      >
        <CloseButton onClick={close} />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-amber-700/30 pb-2.5 pr-10 sm:mb-4 sm:pb-3 sm:pr-11">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="text-2xl sm:text-3xl">{icon}</span>
            <div>
              <h2 className="text-lg font-black leading-tight text-amber-950 sm:text-2xl">{title}</h2>
              <p className="text-[11px] font-bold leading-snug text-amber-800 sm:text-xs">{subtitle}</p>
            </div>
          </div>
          {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
