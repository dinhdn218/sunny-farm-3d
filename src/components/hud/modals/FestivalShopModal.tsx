'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/useGameStore';
import { COSMETICS } from '@/config/cosmetics';
import { FestivalConfig } from '@/config/festivals';
import { activeFestival, festivalDaysLeft, nextFestival } from '@/lib/festivals';
import { todayKey } from '@/lib/clock';
import { ModalShell } from './ModalShell';

// The try-on preview is its own WebGL canvas, browser only
const ItemPreview = dynamic(() => import('../ItemPreview'), { ssr: false });

// 2026-12-15 → 15/12/2026
const shortDate = (key: string) => key.split('-').reverse().join('/');

// The running festival's stall: trade its tokens for festival-only wearables and decor (in the Park)
export function FestivalShopModal() {
  const today = todayKey();
  const festival = activeFestival(today);
  if (!festival) {
    const next = nextFestival(today);
    return (
      <ModalShell icon="🎪" title="Quầy Lễ Hội" subtitle="Hiện chưa có lễ hội nào diễn ra.">
        <p className="rounded-xl border border-amber-700/20 bg-amber-50/80 px-3 py-3 text-center text-sm font-bold text-amber-900">
          {next
            ? `Lễ hội tiếp theo: ${next.icon} ${next.name}, từ ${shortDate(next.start)} đến ${shortDate(next.end)}.`
            : 'Hẹn gặp lại ở lễ hội sau!'}
        </p>
      </ModalShell>
    );
  }
  return <FestivalShop festival={festival} today={today} />;
}

function FestivalShop({ festival, today }: { festival: FestivalConfig; today: string }) {
  const tokens = useGameStore((s) => s.festivalTokens[festival.id] ?? 0);
  const cosmetics = useGameStore((s) => s.cosmetics);
  const ownedCosmetics = useGameStore((s) => s.ownedCosmetics);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const buyFestivalItem = useGameStore((s) => s.buyFestivalItem);
  const setWorld = useGameStore((s) => s.setWorld);
  const items = COSMETICS.filter((c) => c.festival === festival.id);
  const [previewId, setPreviewId] = useState(items[0]?.id);

  const { token, shop, ui } = festival;
  const atPark = currentWorld === 'park';
  const preview = items.find((c) => c.id === previewId) ?? items[0];
  const isDecor = preview?.category === 'decor';

  return (
    <ModalShell
      icon={shop.icon}
      title={shop.name}
      subtitle={`${festival.name} còn ${festivalDaysLeft(festival, today)} ngày • đổi ${token.name} lấy đồ giới hạn`}
      maxWidth="max-w-4xl"
      headerRight={
        <div className={`rounded-xl px-3 py-1.5 text-sm font-black ${ui.chip}`}>
          {token.icon} {tokens} {token.name}
        </div>
      }
    >
      {!atPark && (
        <div
          className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-xs font-bold ${ui.panel}`}
        >
          <span>👀 Bạn đang xem quầy. Đến Công Viên để đổi quà.</span>
          <button
            onClick={() => setWorld('park')}
            className={`rounded-lg px-2.5 py-1 text-xs font-black text-white ${ui.button}`}
          >
            🌸 Đến Công Viên
          </button>
        </div>
      )}
      <div className="mb-3 rounded-xl border border-amber-700/20 bg-amber-50/80 px-3 py-2 text-[11px] font-bold text-amber-900">
        Kiếm {token.name}: {festival.earn.map((rule) => `${rule.label} +${rule.tokens}`).join(' • ')} • 📜 Nhiệm vụ
        trong tab {festival.icon} Lễ Hội
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        {preview && (
          <div className="flex shrink-0 flex-col gap-2 md:w-56">
            <div className={`h-44 overflow-hidden rounded-2xl border-2 bg-gradient-to-b md:h-64 ${ui.preview}`}>
              <ItemPreview
                cosmetics={isDecor ? undefined : { ...cosmetics, [preview.category]: preview.id }}
                decorId={isDecor ? preview.id : null}
              />
            </div>
            <div className={`text-center text-xs font-black ${ui.text}`}>
              👀 {preview.icon} {preview.name}
            </div>
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {items.map((item) => {
            const owned = ownedCosmetics.includes(item.id);
            const price = item.priceTokens ?? 0;
            const canBuy = atPark && !owned && tokens >= price;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setPreviewId(item.id)}
                onClick={() => setPreviewId(item.id)}
                className={`flex flex-col justify-between gap-2 rounded-2xl border-2 p-3 ${
                  previewId === item.id ? ui.selected : 'border-amber-700/40 bg-amber-100/90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl ${ui.tile}`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-black text-amber-950">{item.name}</div>
                    <p className="text-[11px] font-bold text-amber-800">{item.description}</p>
                    {item.perk && (
                      <p className="mt-1 rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[11px] font-black text-emerald-800">
                        {item.perk}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-amber-700/20 pt-2">
                  <span className={`text-xs font-black ${owned ? 'text-emerald-700' : ui.text}`}>
                    {owned ? '✓ Đã có' : `${token.icon} ${price} ${token.name}`}
                  </span>
                  {!owned && (
                    <button
                      onClick={() => buyFestivalItem(item.id)}
                      disabled={!canBuy}
                      className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black text-white ${
                        canBuy ? ui.button : 'bg-slate-400'
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
