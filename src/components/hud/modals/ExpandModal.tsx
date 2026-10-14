'use client';

import { useGameStore } from '@/store/useGameStore';
import {
  GRID_SIZE,
  PLOT_TILES,
  PLOTS_PER_SIDE,
  STARTER_PLOTS,
  isPlotPurchasable,
  plotKey,
  plotPrice,
} from '@/config/farm';
import { ModalShell } from './ModalShell';

const PLOT_ROWS = Array.from({ length: PLOTS_PER_SIDE }, (_, i) => i);

// Land map of the farm: buy plots next to the ones you own to grow the field and the island
export function ExpandModal() {
  const gold = useGameStore((s) => s.gold);
  const ownedPlots = useGameStore((s) => s.ownedPlots);
  const selectedPlot = useGameStore((s) => s.selectedPlot);
  const selectPlot = useGameStore((s) => s.selectPlot);
  const buyPlot = useGameStore((s) => s.buyPlot);

  const price = plotPrice(ownedPlots.length);
  const totalPlots = PLOTS_PER_SIDE * PLOTS_PER_SIDE;
  const tilesPerPlot = PLOT_TILES * PLOT_TILES;
  const selectedOwned = !!selectedPlot && ownedPlots.includes(selectedPlot);
  const selectedBuyable = !!selectedPlot && isPlotPurchasable(selectedPlot, ownedPlots);
  const [selX, selZ] = selectedPlot ? selectedPlot.split('-').map(Number) : [0, 0];

  return (
    <ModalShell
      icon="🏗️"
      title="Mở Rộng Nông Trại"
      subtitle="Mua lô đất mới bằng Vàng để mở rộng bản đồ canh tác"
      maxWidth="max-w-3xl"
      headerRight={
        <div className="rounded-xl bg-amber-900 px-3 py-1.5 text-sm font-black text-yellow-300">
          🪙 {gold} Vàng
        </div>
      }
    >
      <div className="flex flex-col gap-4 overflow-y-auto pr-1 md:flex-row">
        <div className="mx-auto shrink-0">
          <div className="mb-1 text-center text-[11px] font-black text-amber-800">
            ⬆ Bắc · Nhà & Cửa hàng
          </div>
          <div className="grid grid-cols-4 gap-1.5 rounded-2xl border-2 border-amber-700/40 bg-sky-200/60 p-2">
            {PLOT_ROWS.map((pz) =>
              PLOT_ROWS.map((px) => {
                const key = plotKey(px, pz);
                const owned = ownedPlots.includes(key);
                const buyable = isPlotPurchasable(key, ownedPlots);
                return (
                  <button
                    key={key}
                    onClick={() => selectPlot(key)}
                    className={`flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 text-[10px] font-black transition sm:h-20 sm:w-20 ${
                      owned
                        ? 'border-emerald-800 bg-emerald-500 text-white'
                        : buyable
                        ? 'border-amber-700 bg-amber-300 text-amber-950 hover:bg-amber-200'
                        : 'border-slate-400 bg-slate-300 text-slate-500'
                    } ${selectedPlot === key ? 'ring-4 ring-sky-500' : ''}`}
                  >
                    <span className="text-lg leading-none">
                      {owned ? (STARTER_PLOTS.includes(key) ? '🏡' : '🌱') : buyable ? '🔓' : '🔒'}
                    </span>
                    <span className="mt-1 leading-none">
                      {owned ? 'Đã có' : buyable ? `${price}🪙` : 'Khóa'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-1 text-center text-[11px] font-black text-amber-800">
            ⬇ Nam · Cổng Dịch Chuyển
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-4">
            <div className="flex justify-between text-xs font-black text-amber-900">
              <span>🗺️ Đất đang sở hữu</span>
              <span>
                {ownedPlots.length}/{totalPlots} lô · {ownedPlots.length * tilesPerPlot}/
                {GRID_SIZE * GRID_SIZE} ô đất
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-amber-950/20">
              <div
                className="h-full bg-gradient-to-r from-lime-400 to-emerald-600"
                style={{ width: `${(ownedPlots.length / totalPlots) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-amber-700/40 bg-white/80 p-4">
            {!selectedPlot ? (
              <p className="text-sm font-bold text-amber-800">
                👈 Chọn một lô đất trên bản đồ. Lô màu vàng 🔓 có thể mua ngay.
              </p>
            ) : (
              <>
                <div className="text-base font-black text-amber-950">
                  Lô đất ({selX + 1}, {selZ + 1})
                </div>
                <p className="mt-1 text-xs font-bold text-amber-800">
                  {selectedOwned
                    ? 'Bạn đã sở hữu lô đất này.'
                    : selectedBuyable
                    ? `${tilesPerPlot} ô đất mới để cày cấy. Nông trại sẽ mở rộng ra phía này.`
                    : 'Lô đất này phải nằm cạnh một lô bạn đã sở hữu.'}
                </p>
                {selectedBuyable && (
                  <button
                    onClick={() => buyPlot(selectedPlot)}
                    disabled={gold < price}
                    className={`game-btn mt-3 w-full rounded-xl py-2.5 text-sm font-black text-white ${
                      gold >= price ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-400'
                    }`}
                  >
                    {gold >= price ? `🔓 Mở Khóa Lô Đất (🪙 ${price})` : `Cần 🪙 ${price} Vàng`}
                  </button>
                )}
              </>
            )}
          </div>

          <ul className="space-y-1 rounded-2xl border-2 border-amber-700/20 bg-amber-50/70 p-3 text-[11px] font-bold text-amber-800">
            <li>• Lô mới phải nằm cạnh lô đã sở hữu.</li>
            <li>• Mỗi lô mua thêm tăng giá 200 Vàng.</li>
            <li>• Đảo tự nới rộng, nhà cửa và đồ trang trí dời ra ngoài để nhường chỗ.</li>
            <li>• Lô hoang hiện trên nông trại kèm biển giá, click để mở bảng này.</li>
          </ul>
        </div>
      </div>
    </ModalShell>
  );
}
