'use client';

import { useGameStore } from '@/store/useGameStore';
import { placeableInfo } from '@/lib/farmLayout';
import { TOOL_NAMES, nextSeedTool, waterCapacity } from '@/lib/tools';
import { CROPS, CROP_LIST } from '@/config/crops';
import { CropId, ToolId } from '@/types/game';

interface HotbarSlot {
  // 'seeds' is the one slot for every crop's seeds (lib/tools)
  id: ToolId | 'seeds';
  key: string;
  name: string;
  icon: string;
  desc: string;
}

const SLOTS: HotbarSlot[] = [
  { id: 'hoe', key: '1', name: 'Cuốc Đất', icon: '⛏️', desc: 'Cày cỏ thành đất canh tác (-2 Thể lực)' },
  { id: 'water', key: '2', name: 'Bình Tưới', icon: '🚿', desc: 'Tưới ẩm đất giúp cây lớn (-2 Thể lực, -1 Nước)' },
  { id: 'basket', key: '3', name: 'Giỏ Thu Hoạch', icon: '🧺', desc: 'Thu hoạch cây đã chín (Giai đoạn 3)' },
  { id: 'seeds', key: '4', name: 'Hạt Giống', icon: '🌱', desc: 'Gieo lên đất đã cuốc' },
  { id: 'bread', key: '5', name: 'Bánh Mì', icon: '🥖', desc: 'Ăn ngay để hồi +45 Thể lực' },
  { id: 'feed', key: '6', name: 'Chăn Nuôi', icon: '🐄', desc: 'Click vào Gà, Cừu, Bò trong chuồng để cho ăn & thu hoạch' },
  { id: 'fertilizer', key: '7', name: 'Phân Bón', icon: '🪴', desc: 'Bón lên ô đất đã cuốc: lần thu hoạch tới được gấp đôi' },
];

const AREA_NAMES = ['1 ô', '3 ô cùng hàng', '3×3 ô'];

// Upgraded hoes and cans get their tier's name and reach; the seed slot shows the crop in hand
function describeSlot(slot: HotbarSlot, tiers: { hoe: number; water: number }, seedCrop: CropId) {
  if (slot.id === 'seeds') {
    const crop = CROPS[seedCrop];
    return {
      icon: crop.icon,
      name: `Hạt ${crop.name}`,
      desc: `Gieo lên đất đã cuốc • ${crop.description} • Phím 4 đổi loại hạt`,
    };
  }
  if (slot.id === 'hoe' && tiers.hoe > 0) {
    return {
      icon: slot.icon,
      name: TOOL_NAMES.hoe[tiers.hoe],
      desc: `Cày ${AREA_NAMES[tiers.hoe]} một lần (-1 Thể lực mỗi ô)`,
    };
  }
  if (slot.id === 'water' && tiers.water > 0) {
    return {
      icon: slot.icon,
      name: TOOL_NAMES.water[tiers.water],
      desc: `Tưới ${AREA_NAMES[tiers.water]} một lần, bình ${waterCapacity(tiers.water)} nước (-1 Thể lực mỗi ô)`,
    };
  }
  return { icon: slot.icon, name: slot.name, desc: slot.desc };
}

// Farm-only hotbar with the active-tool banner above it, as in the HTML version
export function Hotbar() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const activeTool = useGameStore((s) => s.activeTool);
  const lastSeedCrop = useGameStore((s) => s.lastSeedCrop);
  const setActiveTool = useGameStore((s) => s.setActiveTool);
  const fetchWater = useGameStore((s) => s.fetchWater);
  const seeds = useGameStore((s) => s.seeds);
  const breadCount = useGameStore((s) => s.breadCount);
  const animalFeed = useGameStore((s) => s.animalFeed);
  const fertilizer = useGameStore((s) => s.fertilizer);
  const placingDecor = useGameStore((s) => s.placingDecor);
  const rotatePlacingDecor = useGameStore((s) => s.rotatePlacingDecor);
  const cancelPlacingDecor = useGameStore((s) => s.cancelPlacingDecor);
  const placingSprinkler = useGameStore((s) => s.placingSprinkler);
  const cancelPlacingSprinkler = useGameStore((s) => s.cancelPlacingSprinkler);
  const toolTiers = useGameStore((s) => s.toolTiers);

  if (currentWorld !== 'farm') return null;

  const holdingSeeds = activeTool.startsWith('seed_');
  const seedCrop = holdingSeeds ? (activeTool.replace('seed_', '') as CropId) : lastSeedCrop;
  const isActive = (slot: HotbarSlot) => (slot.id === 'seeds' ? holdingSeeds : activeTool === slot.id);
  const activeSlot = SLOTS.find(isActive) ?? SLOTS[0];
  const active = { ...activeSlot, ...describeSlot(activeSlot, toolTiers, seedCrop) };
  const placingItem = placingDecor ? placeableInfo(placingDecor.id) : undefined;
  const countFor = (slot: HotbarSlot) => {
    if (slot.id === 'seeds') return seeds[seedCrop] || 0;
    if (slot.id === 'bread') return breadCount;
    if (slot.id === 'feed') return animalFeed;
    if (slot.id === 'fertilizer') return fertilizer;
    return null;
  };
  // The seed slot takes out the last seeds, or moves on to the next crop's
  const pick = (slot: HotbarSlot) =>
    setActiveTool(slot.id === 'seeds' ? nextSeedTool(activeTool, lastSeedCrop) : slot.id);

  return (
    <footer className="pointer-events-none fixed bottom-2.5 left-0 right-0 z-20 flex flex-col items-center px-2">
      {placingSprinkler ? (
        <div className="pointer-events-auto mb-1.5 flex items-center gap-2 rounded-full border-2 border-sky-300/80 bg-sky-950/90 px-3.5 py-1 text-xs font-extrabold text-sky-100 shadow-lg">
          <span>💦 Đang đặt Bình Phun: click một ô ruộng trống • Esc hủy</span>
          <button
            onClick={cancelPlacingSprinkler}
            className="rounded-lg bg-rose-500 px-2 py-0.5 text-xs font-black text-white hover:bg-rose-400"
          >
            ✕ Hủy
          </button>
        </div>
      ) : placingItem ? (
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
        <>
          {/* Every crop's seeds while the seed slot is in hand */}
          {holdingSeeds && (
            <div className="pointer-events-auto mb-1.5 flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-teal-950/85 p-1 shadow-lg">
              {CROP_LIST.map((crop) => {
                const count = seeds[crop.id] || 0;
                return (
                  <button
                    key={crop.id}
                    onClick={() => setActiveTool(`seed_${crop.id}`)}
                    title={`Hạt ${crop.name}: còn ${count}`}
                    aria-label={`Hạt ${crop.name}, còn ${count}`}
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${
                      crop.id === seedCrop ? 'bg-yellow-300 ring-2 ring-white' : 'bg-teal-800/80 hover:bg-teal-700'
                    } ${count > 0 ? '' : 'opacity-50'}`}
                  >
                    {crop.icon}
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 px-1 text-[9px] font-black leading-4 text-white">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="pointer-events-auto mb-1.5 flex items-center gap-2 rounded-full border-2 border-teal-300/80 bg-teal-950/90 px-3.5 py-1 text-xs font-extrabold text-teal-50 shadow-lg">
            <span>
              {active.icon} {active.name}: {active.desc}
            </span>
            {active.id === 'water' && (
              <button
                onClick={fetchWater}
                className="ml-1 rounded-lg bg-sky-500 px-2 py-0.5 text-xs font-black text-white hover:bg-sky-400"
              >
                💧 Ra Giếng Múc Nước
              </button>
            )}
          </div>
        </>
      )}

      <div className="bar-panel pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-3xl p-2 sm:gap-2">
        {SLOTS.map((slot) => {
          const count = countFor(slot);
          const look = describeSlot(slot, toolTiers, seedCrop);
          return (
            <button
              key={slot.id}
              onClick={() => pick(slot)}
              title={`${look.name} (phím ${slot.key})`}
              className={`hotbar-slot relative flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl ${
                isActive(slot) ? 'active' : ''
              }`}
            >
              <span className="absolute left-1.5 top-0.5 text-[9px] font-black text-amber-900">
                {slot.key}
              </span>
              <span className="mt-1 text-xl leading-none">{look.icon}</span>
              <span className="max-w-[90%] truncate text-[9px] font-extrabold text-amber-950">
                {look.name.replace('Hạt ', '')}
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
