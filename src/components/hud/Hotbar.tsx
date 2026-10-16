'use client';

import { ReactNode, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { placeableInfo } from '@/lib/farmLayout';
import { TOOL_NAMES, nextSeedTool, waterCapacity } from '@/lib/tools';
import { CROPS, CROP_LIST } from '@/config/crops';
import { CropId, ToolId } from '@/types/game';
import { useBottomInset } from './useBottomInset';

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
      desc: `Gieo lên đất đã cuốc • ${crop.description}`,
      keys: 'Phím 4 đổi loại hạt',
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

// Keyboard hints, which only make sense from sm up (phones have none of these keys)
const KeyHint = ({ children }: { children: ReactNode }) => <span className="hidden sm:inline"> • {children}</span>;

// The banner over the hotbar: a pill on one line where there is room, a card whose text wraps on phones,
// with its buttons kept whole beside it
function Caption({ tone, children, actions }: { tone: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div
      className={`pointer-events-auto mb-1.5 flex max-w-full items-center gap-2 rounded-2xl border-2 px-3 py-1.5 text-xs font-extrabold shadow-lg sm:rounded-full sm:px-3.5 sm:py-1 ${tone}`}
    >
      <span className="min-w-0">{children}</span>
      {actions && <span className="flex shrink-0 gap-1.5">{actions}</span>}
    </div>
  );
}

const CAPTION_BUTTON = 'whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-black text-white';

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
  // The phone's controls sit just above the bar, however tall its caption and seed picker make it
  const footerRef = useRef<HTMLElement>(null);
  useBottomInset(footerRef, currentWorld === 'farm');

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
    <footer
      ref={footerRef}
      className="pointer-events-none fixed bottom-2.5 left-0 right-0 z-20 flex flex-col items-center px-2"
    >
      {placingSprinkler ? (
        <Caption
          tone="border-sky-300/80 bg-sky-950/90 text-sky-100"
          actions={
            <button onClick={cancelPlacingSprinkler} className={`${CAPTION_BUTTON} bg-rose-500 hover:bg-rose-400`}>
              ✕ Hủy
            </button>
          }
        >
          💦 Đang đặt Bình Phun: chọn một ô ruộng trống<KeyHint>Esc hủy</KeyHint>
        </Caption>
      ) : placingItem ? (
        <Caption
          tone="border-lime-300/80 bg-emerald-950/90 text-lime-100"
          actions={
            <>
              <button onClick={rotatePlacingDecor} className={`${CAPTION_BUTTON} bg-sky-500 hover:bg-sky-400`}>
                ↻ Xoay
              </button>
              <button onClick={cancelPlacingDecor} className={`${CAPTION_BUTTON} bg-rose-500 hover:bg-rose-400`}>
                ✕ Hủy
              </button>
            </>
          }
        >
          🏗️ Đang đặt {placingItem.icon} {placingItem.name}: chọn chỗ để đặt<KeyHint>R xoay • Esc hủy</KeyHint>
        </Caption>
      ) : (
        <>
          {/* Every crop's seeds while the seed slot is in hand */}
          {holdingSeeds && (
            <div className="pointer-events-auto mb-1.5 flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-amber-950/85 p-1 shadow-lg">
              {CROP_LIST.map((crop) => {
                const count = seeds[crop.id] || 0;
                return (
                  <button
                    key={crop.id}
                    onClick={() => setActiveTool(`seed_${crop.id}`)}
                    title={`Hạt ${crop.name}: còn ${count}`}
                    aria-label={`Hạt ${crop.name}, còn ${count}`}
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${
                      crop.id === seedCrop ? 'bg-yellow-300 ring-2 ring-white' : 'bg-amber-800/80 hover:bg-amber-700'
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
          <Caption
            tone="border-amber-300/80 bg-amber-950/90 text-amber-50"
            actions={
              active.id === 'water' && (
                <button onClick={fetchWater} className={`${CAPTION_BUTTON} bg-sky-500 hover:bg-sky-400`}>
                  💧 Ra Giếng<span className="hidden sm:inline"> Múc Nước</span>
                </button>
              )
            }
          >
            {active.icon} {active.name}: {active.desc}
            {'keys' in active && active.keys && <KeyHint>{active.keys}</KeyHint>}
          </Caption>
        </>
      )}

      <div className="bar-panel pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-3xl p-1.5 sm:gap-2 sm:p-2">
        {SLOTS.map((slot) => {
          const count = countFor(slot);
          const look = describeSlot(slot, toolTiers, seedCrop);
          return (
            <button
              key={slot.id}
              onClick={() => pick(slot)}
              title={`${look.name} (phím ${slot.key})`}
              className={`hotbar-slot relative flex h-11 w-[42px] shrink-0 flex-col items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${
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
