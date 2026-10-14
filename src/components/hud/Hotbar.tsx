'use client';

import { useGameStore } from '@/store/useGameStore';
import { placeableInfo } from '@/lib/farmLayout';
import { CropId, ToolId } from '@/types/game';

interface HotbarSlot {
  id: ToolId;
  key: string;
  name: string;
  icon: string;
  desc: string;
  crop?: CropId;
}

const SLOTS: HotbarSlot[] = [
  { id: 'hoe', key: '1', name: 'Cuốc Đất', icon: '⛏️', desc: 'Cày cỏ thành đất canh tác (-2 Thể lực)' },
  { id: 'water', key: '2', name: 'Bình Tưới', icon: '🚿', desc: 'Tưới ẩm đất giúp cây lớn (-2 Thể lực, -1 Nước)' },
  { id: 'basket', key: '3', name: 'Giỏ Thu Hoạch', icon: '🧺', desc: 'Thu hoạch cây đã chín (Giai đoạn 3)' },
  { id: 'seed_carrot', key: '4', name: 'Hạt Cà Rốt', icon: '🥕', crop: 'carrot', desc: 'Gieo lên đất đã cuốc (2 ngày thu hoạch)' },
  { id: 'seed_wheat', key: '5', name: 'Hạt Lúa Mì', icon: '🌾', crop: 'wheat', desc: 'Gieo lên đất đã cuốc (2 ngày thu hoạch)' },
  { id: 'seed_tomato', key: '6', name: 'Hạt Cà Chua', icon: '🍅', crop: 'tomato', desc: 'Cây lâu năm: Thu hoạch xong vẫn giữ gốc!' },
  { id: 'seed_pumpkin', key: '7', name: 'Hạt Bí Ngô', icon: '🎃', crop: 'pumpkin', desc: 'Gieo lên đất đã cuốc (Bán giá cực cao)' },
  { id: 'bread', key: '8', name: 'Bánh Mì', icon: '🥖', desc: 'Ăn ngay để hồi +45 Thể lực' },
  { id: 'feed', key: '9', name: 'Chăn Nuôi', icon: '🐄', desc: 'Click vào Gà, Cừu, Bò trong chuồng để cho ăn & thu hoạch' },
];

// Farm-only hotbar with the active-tool banner above it, as in the HTML version
export function Hotbar() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const activeTool = useGameStore((s) => s.activeTool);
  const setActiveTool = useGameStore((s) => s.setActiveTool);
  const refillWater = useGameStore((s) => s.refillWater);
  const seeds = useGameStore((s) => s.seeds);
  const breadCount = useGameStore((s) => s.breadCount);
  const animalFeed = useGameStore((s) => s.animalFeed);
  const placingDecor = useGameStore((s) => s.placingDecor);
  const rotatePlacingDecor = useGameStore((s) => s.rotatePlacingDecor);
  const cancelPlacingDecor = useGameStore((s) => s.cancelPlacingDecor);

  if (currentWorld !== 'farm') return null;

  const active = SLOTS.find((s) => s.id === activeTool) ?? SLOTS[0];
  const placingItem = placingDecor ? placeableInfo(placingDecor.id) : undefined;
  const countFor = (slot: HotbarSlot) => {
    if (slot.crop) return seeds[slot.crop] || 0;
    if (slot.id === 'bread') return breadCount;
    if (slot.id === 'feed') return animalFeed;
    return null;
  };

  return (
    <footer className="pointer-events-none fixed bottom-2.5 left-0 right-0 z-20 flex flex-col items-center px-2">
      {placingItem ? (
        <div className="pointer-events-auto mb-1.5 flex items-center gap-2 rounded-full border-2 border-lime-300/80 bg-emerald-950/90 px-3.5 py-1 text-xs font-extrabold text-lime-100 shadow-lg">
          <span>
            🏗️ Đang đặt {placingItem.icon} {placingItem.name}: Click chuột để đặt • R xoay • Esc hủy
          </span>
          <button
            onClick={rotatePlacingDecor}
            className="rounded-lg bg-sky-500 px-2 py-0.5 text-xs font-black text-white hover:bg-sky-400"
          >
            ↻ Xoay
          </button>
          <button
            onClick={cancelPlacingDecor}
            className="rounded-lg bg-rose-500 px-2 py-0.5 text-xs font-black text-white hover:bg-rose-400"
          >
            ✕ Hủy
          </button>
        </div>
      ) : (
        <div className="pointer-events-auto mb-1.5 flex items-center gap-2 rounded-full border-2 border-amber-400/70 bg-amber-950/90 px-3.5 py-1 text-xs font-extrabold text-amber-100 shadow-lg">
          <span>
            {active.icon} {active.name}: {active.desc}
          </span>
          {active.id === 'water' && (
            <button
              onClick={refillWater}
              className="ml-1 rounded-lg bg-sky-500 px-2 py-0.5 text-xs font-black text-white hover:bg-sky-400"
            >
              💧 Múc Đầy Nước
            </button>
          )}
        </div>
      )}

      <div className="wood-panel pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-3xl p-2 sm:gap-2">
        {SLOTS.map((slot) => {
          const count = countFor(slot);
          return (
            <button
              key={slot.id}
              onClick={() => setActiveTool(slot.id)}
              className={`hotbar-slot relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl ${
                activeTool === slot.id ? 'active' : ''
              }`}
            >
              <span className="absolute left-1.5 top-0.5 text-[9px] font-black text-amber-900">
                {slot.key}
              </span>
              <span className="mt-1 text-xl leading-none">{slot.icon}</span>
              <span className="max-w-[90%] truncate text-[9px] font-extrabold text-amber-950">
                {slot.name.replace('Hạt ', '')}
              </span>
              {count !== null && (
                <span
                  className={`absolute -right-1.5 -top-1.5 rounded-full border border-white px-1.5 text-[10px] font-black text-white ${
                    count > 0 ? 'bg-emerald-600' : 'bg-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </footer>
  );
}
