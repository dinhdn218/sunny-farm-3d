'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { COSMETICS } from '@/config/cosmetics';
import { CosmeticCategory, CosmeticItem } from '@/types/game';
import { ModalShell } from './ModalShell';

// Same four tabs as the HTML version; wings/back items and pets share the accessories tab
const TABS: { id: string; label: string; categories: CosmeticCategory[] }[] = [
  { id: 'hats', label: '🎩 Mũ & Nón', categories: ['hat'] },
  { id: 'outfits', label: '👕 Trang Phục', categories: ['outfit'] },
  { id: 'accessories', label: '👼 Cánh & Thú Cưng Shiba', categories: ['wing', 'pet'] },
  { id: 'farmDecor', label: '🏡 Trang Trí Nông Trại', categories: ['decor'] },
];

function priceLabel(item: CosmeticItem) {
  if (item.priceGold > 0 && item.priceGems > 0) {
    return `🪙 ${item.priceGold} + 💎 ${item.priceGems}`;
  }
  if (item.priceGems > 0) return `💎 ${item.priceGems} Kim Cương`;
  return `🪙 ${item.priceGold} Vàng`;
}

export function WardrobeModal() {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const cosmetics = useGameStore((s) => s.cosmetics);
  const ownedCosmetics = useGameStore((s) => s.ownedCosmetics);
  const buyOrEquipCosmetic = useGameStore((s) => s.buyOrEquipCosmetic);
  const [tabId, setTabId] = useState(TABS[0].id);

  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  const items = COSMETICS.filter((c) => tab.categories.includes(c.category));

  return (
    <ModalShell
      icon="👗"
      title="Cửa Hàng Thời Trang & Trang Trí"
      subtitle="Mặc thử mũ, quần áo, cánh thiên thần, thú cưng Shiba và nâng cấp nông trại!"
      maxWidth="max-w-3xl"
      headerRight={
        <>
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-900 px-3 py-1 text-xs font-black text-yellow-300 sm:text-sm">
            🪙 {gold}
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-sky-900 px-3 py-1 text-xs font-black text-sky-300 sm:text-sm">
            💎 {gems}
          </div>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTabId(t.id)}
            className={`game-btn rounded-xl px-3.5 py-1.5 text-xs font-black sm:text-sm ${
              tabId === t.id ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isDecor = item.category === 'decor';
          const owned = ownedCosmetics.includes(item.id);
          // Decor is placed on the farm as soon as it is bought
          const equipped = isDecor
            ? owned
            : cosmetics[item.category as keyof typeof cosmetics] === item.id;

          return (
            <div
              key={item.id}
              className={`flex flex-col justify-between gap-2 rounded-2xl border-2 p-3.5 ${
                equipped
                  ? 'border-emerald-600 bg-yellow-100 shadow-md'
                  : 'border-amber-700/40 bg-amber-100/90'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-700 bg-amber-300/80 text-2xl">
                  {item.icon}
                </div>
                <div>
                  <div className="text-sm font-black text-amber-950">{item.name}</div>
                  <p className="mt-0.5 text-[11px] font-bold text-amber-800">
                    {item.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-amber-700/20 pt-2">
                <span
                  className={`text-xs font-black ${owned ? 'text-emerald-700' : 'text-amber-900'}`}
                >
                  {owned ? '✓ Đã sở hữu' : priceLabel(item)}
                </span>
                <button
                  onClick={() => buyOrEquipCosmetic(item.id)}
                  className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black ${
                    equipped
                      ? 'bg-slate-700 text-white'
                      : owned
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {equipped
                    ? isDecor
                      ? 'Đang Đặt'
                      : 'Đang Mặc'
                    : owned
                    ? 'Mặc Ngay'
                    : 'Mua Ngay'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
