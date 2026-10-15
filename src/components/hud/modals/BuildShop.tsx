'use client';

import { useGameStore } from '@/store/useGameStore';
import { BUILD_PIECE_LIST } from '@/config/build';

// Building pieces in the farm decor tab: bought by the piece, laid out cell by cell in build mode
export function BuildShop() {
  const gold = useGameStore((s) => s.gold);
  const stock = useGameStore((s) => s.buildStock);
  const placed = useGameStore((s) => s.buildPieces.length);
  const onFarm = useGameStore((s) => s.currentWorld === 'farm');
  const buyBuildPieces = useGameStore((s) => s.buyBuildPieces);
  const startBuilding = useGameStore((s) => s.startBuilding);

  return (
    <div className="col-span-full rounded-2xl border-2 border-lime-700/40 bg-lime-50/90 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-amber-950">🧱 Xây Dựng Theo Ô</div>
          <div className="text-[11px] font-bold text-amber-800">
            Mua từng mảnh rồi bấm Xây: click hoặc kéo chuột để đặt theo lưới, R xoay • Đã đặt: {placed} mảnh
          </div>
        </div>
        <button
          onClick={() => startBuilding('erase')}
          disabled={!onFarm || placed === 0}
          className="game-btn rounded-xl bg-slate-600 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-500 disabled:bg-slate-300"
        >
          🧽 Dọn Bớt
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {BUILD_PIECE_LIST.map((piece) => (
          <div
            key={piece.id}
            title={piece.description}
            className="flex flex-col items-center gap-1 rounded-xl border border-lime-700/20 bg-white/80 p-2 text-center"
          >
            <div className="text-2xl leading-none">{piece.icon}</div>
            <div className="text-[11px] font-black text-amber-950">{piece.name}</div>
            <div className="text-[10px] font-bold text-amber-700">
              🪙{piece.price}/mảnh • Kho: {stock[piece.id] ?? 0}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => buyBuildPieces(piece.id, 5)}
                disabled={gold < piece.price * 5}
                className="rounded-lg bg-amber-600 px-2 py-0.5 text-[10px] font-black text-white hover:bg-amber-500 disabled:bg-slate-400"
              >
                Mua 5
              </button>
              <button
                onClick={() => startBuilding(piece.id)}
                disabled={!onFarm}
                className="rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white hover:bg-emerald-500 disabled:bg-slate-400"
              >
                🔨 Xây
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
