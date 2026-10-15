'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { ITEM_LIST } from '@/config/items';
import { marketDay, marketPrice } from '@/lib/market';
import { SEASONS } from '@/config/seasons';
import { isInSeason, seasonOf, seasonalPrice } from '@/lib/seasons';
import { ModalShell } from './ModalShell';

// Today's market at the Mall: prices swing daily, with one sought-after and one glutted item
export function MarketModal() {
  const day = useGameStore((s) => s.day);
  const gold = useGameStore((s) => s.gold);
  const items = useGameStore((s) => s.items);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const sellAtMarket = useGameStore((s) => s.sellAtMarket);

  const market = useMemo(() => marketDay(day), [day]);
  const atMall = currentWorld === 'mall';
  const season = SEASONS[seasonOf(day)];
  const rows = ITEM_LIST.map((item) => ({
    item,
    // Usual price today, in-season bonus included
    base: seasonalPrice(item.id, day),
    price: marketPrice(item.id, day),
    owned: items[item.id] ?? 0,
    inSeason: isInSeason(item.id, day),
    tag: item.id === market.hot ? 'hot' : item.id === market.glut ? 'glut' : null,
  }));
  const bagValue = rows.reduce((sum, r) => sum + r.owned * r.price, 0);

  return (
    <ModalShell
      icon="🧺"
      title="Chợ Phiên Nông Sản"
      subtitle={`Bảng giá Ngày ${day}: giá đổi mỗi ngày, bán ngay tại chợ ở Trung Tâm Thương Mại`}
      maxWidth="max-w-3xl"
      headerRight={
        <div className="rounded-xl bg-amber-900 px-3 py-1.5 text-sm font-black text-yellow-300">
          🪙 {gold} Vàng
        </div>
      }
    >
      {!atMall && (
        <div className="mb-3 rounded-xl border-2 border-amber-600/40 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
          👀 Bạn đang xem bảng giá. Hãy dịch chuyển đến 🛍️ Trung Tâm Thương Mại để bán hàng ở chợ.
        </div>
      )}

      <div className="space-y-1.5 overflow-y-auto pr-1">
        {rows.map(({ item, base, price, owned, inSeason, tag }) => {
          const pct = Math.round((price / base - 1) * 100);
          return (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
                tag === 'hot'
                  ? 'border-rose-400 bg-rose-50'
                  : tag === 'glut'
                  ? 'border-slate-300 bg-slate-100'
                  : 'border-amber-700/20 bg-white/80'
              }`}
            >
              <div className="flex min-w-[180px] items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <div className="text-xs font-black text-amber-950">
                    {item.name}
                    {tag === 'hot' && (
                      <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                        🔥 Đang hot
                      </span>
                    )}
                    {tag === 'glut' && (
                      <span className="ml-1.5 rounded-full bg-slate-500 px-1.5 py-0.5 text-[10px] text-white">
                        📉 Ế hàng
                      </span>
                    )}
                    {inSeason && (
                      <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                        {season.icon} Đúng mùa
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-amber-700">Giá thường 🪙{base} • Có: {owned}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-amber-950">🪙 {price}</span>
                <span
                  className={`w-12 text-right text-xs font-black ${
                    pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-500'
                  }`}
                >
                  {pct > 0 ? `▲${pct}%` : pct < 0 ? `▼${-pct}%` : '0%'}
                </span>
                <button
                  onClick={() => sellAtMarket(item.id, 1)}
                  disabled={!atMall || owned === 0}
                  className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                    atMall && owned > 0 ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  Bán 1
                </button>
                <button
                  onClick={() => sellAtMarket(item.id, owned)}
                  disabled={!atMall || owned === 0}
                  className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                    atMall && owned > 0 ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  Bán hết
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t-2 border-amber-700/20 pt-3 text-sm font-black text-amber-950">
        <span>🎒 Giỏ của bạn theo giá chợ hôm nay:</span>
        <span className="text-lg text-emerald-700">🪙 {bagValue}</span>
      </div>
    </ModalShell>
  );
}
