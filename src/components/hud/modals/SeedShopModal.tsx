'use client';

import { useGameStore } from '@/store/useGameStore';
import { CROP_LIST } from '@/config/crops';
import { ModalShell } from './ModalShell';

export function SeedShopModal() {
  const gold = useGameStore((s) => s.gold);
  const seeds = useGameStore((s) => s.seeds);
  const breadCount = useGameStore((s) => s.breadCount);
  const buySeed = useGameStore((s) => s.buySeed);
  const buyBread = useGameStore((s) => s.buyBread);

  return (
    <ModalShell
      icon="🏪"
      title="Tạp Hóa Hạt Giống Nông Trại"
      subtitle="Mua hạt giống gieo trồng và thức ăn hồi phục thể lực"
      headerRight={
        <div className="rounded-xl bg-amber-900 px-3 py-1.5 text-sm font-black text-yellow-300">
          🪙 {gold} Vàng
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {CROP_LIST.map((crop) => (
          <div
            key={crop.id}
            className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3.5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-amber-600 bg-amber-300 text-2xl">
                {crop.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-sm font-black text-amber-950">Hạt {crop.name}</span>
                  <span className="text-xs font-bold text-amber-800">
                    Có: {seeds[crop.id] || 0}
                  </span>
                </div>
                <p className="text-xs text-amber-800">{crop.description}</p>
                <div className="text-[11px] font-black text-emerald-800">
                  Bán: 🪙 {crop.sellPrice} Vàng
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-amber-700/20 pt-2">
              <button
                onClick={() => buySeed(crop.id, 1)}
                className="game-btn rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white"
              >
                Mua 1 (🪙{crop.seedPrice})
              </button>
              <button
                onClick={() => buySeed(crop.id, 5)}
                className="game-btn rounded-xl bg-amber-700 px-3 py-1 text-xs font-black text-white"
              >
                Mua 5 (🪙{crop.seedPrice * 5})
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-amber-600 bg-amber-300 text-2xl">
              🥖
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <span className="text-sm font-black text-amber-950">Bánh Mì Nóng</span>
                <span className="text-xs font-bold text-amber-800">Có: {breadCount}</span>
              </div>
              <p className="text-xs text-amber-800">Ăn để hồi +45 Thể lực (phím 8).</p>
              <div className="text-[11px] font-black text-emerald-800">Giá: 🪙 25 Vàng</div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-amber-700/20 pt-2">
            <button
              onClick={buyBread}
              className="game-btn rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white"
            >
              Mua 1 (🪙25)
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
