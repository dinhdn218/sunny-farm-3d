'use client';

import { useGameStore } from '@/store/useGameStore';
import { WORLD_LIST } from '@/config/worlds';
import { ModalShell } from './ModalShell';

export function WorldMapModal() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const setWorld = useGameStore((s) => s.setWorld);

  return (
    <ModalShell
      icon="🗺️"
      title="Bản Đồ Sảnh Thế Giới 3D"
      subtitle="Chọn thành phố hoặc khu vực bạn muốn dịch chuyển đến tham quan & gặp gỡ bạn bè!"
      maxWidth="max-w-3xl"
    >
      <div className="grid grid-cols-1 gap-3.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {WORLD_LIST.map((w) => {
          const isCurrent = currentWorld === w.id;
          return (
            <div
              key={w.id}
              className={`flex flex-col justify-between gap-3 rounded-2xl border-2 p-4 ${
                isCurrent
                  ? 'border-emerald-700 bg-emerald-100'
                  : 'border-amber-700/40 bg-amber-100/90'
              }`}
            >
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-3xl">{w.icon}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                      isCurrent ? 'bg-emerald-600 text-white' : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {isCurrent ? 'Đang ở đây' : 'Khu vực Mở'}
                  </span>
                </div>
                <h3 className="text-base font-black text-amber-950">{w.name}</h3>
                <p className="mt-1 text-xs font-bold text-amber-800">{w.description}</p>
              </div>
              <button
                onClick={() => setWorld(w.id)}
                className={`game-btn w-full rounded-xl py-2 text-xs font-black ${
                  isCurrent
                    ? 'bg-slate-600 text-white'
                    : 'bg-sky-600 text-white hover:bg-sky-500'
                }`}
              >
                {isCurrent ? 'Đang Ở Khu Vực Này' : '✈️ Dịch Chuyển Đến Ngay'}
              </button>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
