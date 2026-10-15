'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { CollectionSetId } from '@/types/game';
import { ITEMS } from '@/config/items';
import { COLLECTION_SETS, setProgress } from '@/lib/collection';
import { ModalShell } from './ModalShell';

// Everything ever found, set by set; a complete set pays its reward once
export function CollectionModal() {
  const collected = useGameStore((s) => s.collected);
  const claimed = useGameStore((s) => s.collectionClaimed);
  const claimCollection = useGameStore((s) => s.claimCollection);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const [tab, setTab] = useState<CollectionSetId>(COLLECTION_SETS[0].id);

  const group = COLLECTION_SETS.find((s) => s.id === tab) ?? COLLECTION_SETS[0];
  const progress = setProgress(group, collected);
  const done = claimed.includes(group.id);
  const total = COLLECTION_SETS.reduce((sum, s) => sum + s.items.length, 0);
  const found = COLLECTION_SETS.reduce((sum, s) => sum + setProgress(s, collected).found, 0);

  return (
    <ModalShell
      icon="📖"
      title="Sổ Sưu Tập"
      subtitle={`Đã tìm thấy ${found}/${total} món • Gom đủ một bộ để nhận thưởng`}
      maxWidth="max-w-3xl"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {COLLECTION_SETS.map((s) => {
          const p = setProgress(s, collected);
          const ready = p.complete && !claimed.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => setTab(s.id)}
              className={`game-btn relative rounded-xl px-3 py-1.5 text-xs font-black ${
                tab === s.id ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
              }`}
            >
              {s.icon} {s.name} {p.found}/{p.total}
              {ready && (
                <span className="absolute -right-1.5 -top-1.5 animate-bounce rounded-full border border-white bg-red-600 px-1.5 text-[10px] font-black text-white">
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-3 rounded-2xl border-2 border-amber-700/30 bg-amber-50/90 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-amber-900">
          <span>
            {group.icon} Bộ {group.name}: {progress.found}/{progress.total} • Thưởng 🪙 +{group.reward.gold} 💎 +
            {group.reward.gems}
          </span>
          {done ? (
            <span className="rounded-lg bg-slate-300 px-3 py-1 text-xs font-black text-slate-700">✓ Đã nhận thưởng</span>
          ) : progress.complete ? (
            <button
              onClick={() => claimCollection(group.id)}
              className="game-btn animate-bounce rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
            >
              🎁 Nhận Thưởng!
            </button>
          ) : (
            <span className="text-amber-700">Còn thiếu {progress.total - progress.found} món</span>
          )}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-950/20">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-lime-500"
            style={{ width: `${(progress.found / progress.total) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
        {group.items.map((id) => {
          const item = ITEMS[id];
          const has = collected.includes(id);
          return (
            <div
              key={id}
              title={has ? item.name : 'Chưa tìm thấy'}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-center ${
                has ? 'border-amber-600/40 bg-white/90' : 'border-dashed border-amber-700/25 bg-amber-100/40'
              }`}
            >
              <span className={`text-2xl leading-none ${has ? '' : 'opacity-40 grayscale'}`}>{has ? item.icon : '❓'}</span>
              <span className={`text-[11px] font-black ${has ? 'text-amber-950' : 'text-amber-700/60'}`}>
                {has ? item.name : '???'}
              </span>
            </div>
          );
        })}
      </div>

      {group.id === 'fish' && (
        <button
          onClick={() => setActiveModal('fishJournal')}
          className="mt-3 self-start rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-500"
        >
          🎣 Xem kích thước kỷ lục trong Sổ Tay Câu Cá
        </button>
      )}
    </ModalShell>
  );
}
