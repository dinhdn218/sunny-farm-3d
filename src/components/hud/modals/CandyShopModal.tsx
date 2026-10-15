'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/useGameStore';
import { COSMETICS } from '@/config/cosmetics';
import { CANDY_PER_NIGHT_FISH, CANDY_PER_PUMPKIN, eventDaysLeft, isEventActive } from '@/lib/event';
import { localDateKey } from '@/lib/dailyGift';
import { ModalShell } from './ModalShell';

// The try-on preview is its own WebGL canvas, browser only
const ItemPreview = dynamic(() => import('../ItemPreview'), { ssr: false });

const FESTIVAL_ITEMS = COSMETICS.filter((c) => c.priceCandy !== undefined);

// Lễ Hội Bí Ngô: trade candy for festival-only wearables and decor (at the stall in the Park)
export function CandyShopModal() {
  const candy = useGameStore((s) => s.candy);
  const cosmetics = useGameStore((s) => s.cosmetics);
  const ownedCosmetics = useGameStore((s) => s.ownedCosmetics);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const buyCandyItem = useGameStore((s) => s.buyCandyItem);
  const setWorld = useGameStore((s) => s.setWorld);
  const [previewId, setPreviewId] = useState(FESTIVAL_ITEMS[0].id);

  const today = localDateKey(new Date());
  const active = isEventActive(today);
  const atPark = currentWorld === 'park';
  const preview = FESTIVAL_ITEMS.find((c) => c.id === previewId) ?? FESTIVAL_ITEMS[0];
  const isDecor = preview.category === 'decor';

  return (
    <ModalShell
      icon="🍬"
      title="Tiệm Kẹo Ma Quái"
      subtitle={
        active
          ? `Lễ Hội Bí Ngô còn ${eventDaysLeft(today)} ngày • đổi kẹo lấy đồ giới hạn`
          : 'Lễ Hội Bí Ngô đã kết thúc, hẹn gặp lại năm sau!'
      }
      maxWidth="max-w-4xl"
      headerRight={
        <div className="rounded-xl bg-purple-900 px-3 py-1.5 text-sm font-black text-amber-300">
          🍬 {candy} Kẹo
        </div>
      }
    >
      {active && !atPark && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-purple-500/40 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900">
          <span>👀 Bạn đang xem quầy. Đến Công Viên để đổi quà.</span>
          <button
            onClick={() => setWorld('park')}
            className="rounded-lg bg-purple-600 px-2.5 py-1 text-xs font-black text-white hover:bg-purple-500"
          >
            🌸 Đến Công Viên
          </button>
        </div>
      )}
      <div className="mb-3 rounded-xl border border-amber-700/20 bg-amber-50/80 px-3 py-2 text-[11px] font-bold text-amber-900">
        Kiếm kẹo: 🎃 Thu hoạch Bí Ngô +{CANDY_PER_PUMPKIN} • 🌙 Câu được cá ban đêm +{CANDY_PER_NIGHT_FISH} • 📜
        Nhiệm vụ trong tab 🎃 Lễ Hội
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <div className="flex shrink-0 flex-col gap-2 md:w-56">
          <div className="h-44 overflow-hidden rounded-2xl border-2 border-purple-700/40 bg-gradient-to-b from-purple-300 to-amber-100 md:h-64">
            <ItemPreview
              cosmetics={isDecor ? undefined : { ...cosmetics, [preview.category]: preview.id }}
              decorId={isDecor ? preview.id : null}
            />
          </div>
          <div className="text-center text-xs font-black text-purple-900">
            👀 {preview.icon} {preview.name}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {FESTIVAL_ITEMS.map((item) => {
            const owned = ownedCosmetics.includes(item.id);
            const price = item.priceCandy ?? 0;
            const canBuy = active && atPark && !owned && candy >= price;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setPreviewId(item.id)}
                onClick={() => setPreviewId(item.id)}
                className={`flex flex-col justify-between gap-2 rounded-2xl border-2 p-3 ${
                  previewId === item.id ? 'border-purple-500 bg-purple-50' : 'border-amber-700/40 bg-amber-100/90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-purple-700 bg-purple-200 text-2xl">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-black text-amber-950">{item.name}</div>
                    <p className="text-[11px] font-bold text-amber-800">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-amber-700/20 pt-2">
                  <span className={`text-xs font-black ${owned ? 'text-emerald-700' : 'text-purple-800'}`}>
                    {owned ? '✓ Đã có' : `🍬 ${price} Kẹo`}
                  </span>
                  {!owned && (
                    <button
                      onClick={() => buyCandyItem(item.id)}
                      disabled={!canBuy}
                      className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black text-white ${
                        canBuy ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-400'
                      }`}
                    >
                      Đổi Quà
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
