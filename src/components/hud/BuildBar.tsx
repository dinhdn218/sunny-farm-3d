'use client';

import { useGameStore } from '@/store/useGameStore';
import { BUILD_PIECES, BUILD_PIECE_LIST } from '@/config/build';

const BUY_COUNT = 5;

// Takes the hotbar's place while building: pick a piece or the eraser, buy more, turn it, finish
export function BuildBar() {
  const mode = useGameStore((s) => s.buildMode);
  const stock = useGameStore((s) => s.buildStock);
  const gold = useGameStore((s) => s.gold);
  const startBuilding = useGameStore((s) => s.startBuilding);
  const rotateBuildPiece = useGameStore((s) => s.rotateBuildPiece);
  const stopBuilding = useGameStore((s) => s.stopBuilding);
  const buyBuildPieces = useGameStore((s) => s.buyBuildPieces);

  if (!mode) return null;
  const selected = mode.kind === 'erase' ? null : BUILD_PIECES[mode.kind];

  return (
    <footer className="pointer-events-none fixed bottom-2.5 left-0 right-0 z-20 flex flex-col items-center px-2">
      <div className="pointer-events-auto mb-1.5 flex flex-wrap items-center justify-center gap-2 rounded-full border-2 border-lime-300/80 bg-emerald-950/90 px-3.5 py-1 text-xs font-extrabold text-lime-100 shadow-lg">
        <span>
          {selected
            ? `🔨 Đang xây ${selected.icon} ${selected.name}: click hoặc giữ chuột trái kéo để đặt • R xoay`
            : '🧽 Đang dọn: click vào mảnh đã đặt để cất lại vào kho'}{' '}
          • Esc xong
        </span>
        {selected && (
          <button
            onClick={rotateBuildPiece}
            className="rounded-lg bg-sky-500 px-2 py-0.5 text-xs font-black text-white hover:bg-sky-400"
          >
            ↻ Xoay
          </button>
        )}
        <button
          onClick={stopBuilding}
          className="rounded-lg bg-emerald-500 px-2 py-0.5 text-xs font-black text-white hover:bg-emerald-400"
        >
          ✓ Xong
        </button>
      </div>

      <div className="wood-panel pointer-events-auto flex max-w-full items-start gap-1.5 overflow-x-auto rounded-3xl p-2 sm:gap-2">
        {BUILD_PIECE_LIST.map((piece) => {
          const count = stock[piece.id] ?? 0;
          return (
            <div key={piece.id} className="flex shrink-0 flex-col items-center gap-1">
              <button
                onClick={() => startBuilding(piece.id)}
                title={piece.description}
                className={`hotbar-slot relative flex h-12 w-12 flex-col items-center justify-center rounded-2xl ${
                  mode.kind === piece.id ? 'active' : ''
                }`}
              >
                <span className="mt-1 text-xl leading-none">{piece.icon}</span>
                <span className="max-w-[90%] truncate text-[9px] font-extrabold text-amber-950">{piece.name}</span>
                <span
                  className={`absolute -right-1.5 -top-1.5 rounded-full border border-white px-1.5 text-[10px] font-black text-white ${
                    count > 0 ? 'bg-emerald-600' : 'bg-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
              <button
                onClick={() => buyBuildPieces(piece.id, BUY_COUNT)}
                disabled={gold < piece.price * BUY_COUNT}
                title={`Mua ${BUY_COUNT} ${piece.name}`}
                className="rounded-md bg-amber-600 px-1.5 text-[9px] font-black text-white hover:bg-amber-500 disabled:bg-slate-400"
              >
                +{BUY_COUNT} 🪙{piece.price * BUY_COUNT}
              </button>
            </div>
          );
        })}
        <button
          onClick={() => startBuilding('erase')}
          title="Cất mảnh đã đặt lại vào kho"
          className={`hotbar-slot flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl ${
            mode.kind === 'erase' ? 'active' : ''
          }`}
        >
          <span className="mt-1 text-xl leading-none">🧽</span>
          <span className="text-[9px] font-extrabold text-amber-950">Dọn</span>
        </button>
      </div>
    </footer>
  );
}
