'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { soundFX } from '@/lib/audio';
import { photoCaption, photoFileName, takePhoto } from '@/lib/photo';

// Photo mode controls in place of the HUD: shutter, exit and a short how-to
export function PhotoOverlay() {
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode);
  const [shots, setShots] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);

  const shoot = useCallback(() => {
    const { currentWorld, day } = useGameStore.getState();
    const fileName = photoFileName(day, new Date());
    if (!takePhoto(photoCaption(currentWorld, day), fileName)) return;
    soundFX.shutter();
    setShots((n) => n + 1);
    setSaved(fileName);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      // A focused button answers these keys with its own click
      if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      e.preventDefault();
      shoot();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shoot]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(null), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {shots > 0 && <div key={shots} className="photo-flash absolute inset-0 bg-white" />}

      <div className="absolute left-1/2 top-3 w-max max-w-[92vw] -translate-x-1/2 rounded-2xl bg-slate-950/70 px-4 py-2 text-center text-white shadow-lg">
        <div className="text-sm font-black">📷 Chế Độ Chụp Ảnh</div>
        <div className="text-[11px] font-bold text-slate-200">
          Kéo chuột để xoay • Cuộn để thu phóng • WASD đi lại • Space chụp • P hoặc Esc để thoát
        </div>
      </div>

      {saved && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-lg">
          ✅ Đã lưu ảnh {saved}
        </div>
      )}

      <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <button
          onClick={shoot}
          title="Chụp ảnh (Space)"
          className="game-btn flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-rose-500 text-2xl shadow-xl hover:bg-rose-400"
        >
          📸
        </button>
        <button
          onClick={togglePhotoMode}
          title="Thoát chế độ chụp ảnh (P / Esc)"
          className="game-btn rounded-xl border-2 border-slate-950 bg-slate-800 px-3 py-2 text-xs font-black text-white hover:bg-slate-700"
        >
          ✕ Thoát
        </button>
      </div>
    </div>
  );
}
