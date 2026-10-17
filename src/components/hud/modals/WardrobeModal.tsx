'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/useGameStore';
import { COSMETICS } from '@/config/cosmetics';
import { CosmeticCategory, CosmeticItem } from '@/types/game';
import { activeFestival } from '@/lib/festivals';
import { FESTIVALS } from '@/config/festivals';
import { todayKey } from '@/lib/clock';
import { ModalShell } from './ModalShell';
import { BuildShop } from './BuildShop';

// The try-on preview is its own WebGL canvas, browser only
const ItemPreview = dynamic(() => import('../ItemPreview'), { ssr: false });

// Same four tabs as the HTML version; wings/back items and pets share the accessories tab.
// `short` names them in the phone's 2×2 grid beside the preview.
const TABS: { id: string; icon: string; label: string; short: string; categories: CosmeticCategory[] }[] = [
  { id: 'hats', icon: '🎩', label: 'Mũ & Nón', short: 'Mũ & Nón', categories: ['hat'] },
  { id: 'outfits', icon: '👕', label: 'Trang Phục', short: 'Trang Phục', categories: ['outfit'] },
  { id: 'accessories', icon: '👼', label: 'Cánh & Thú Cưng', short: 'Phụ Kiện', categories: ['wing', 'pet'] },
  { id: 'farmDecor', icon: '🏡', label: 'Trang Trí Nông Trại', short: 'Trang Trí', categories: ['decor'] },
];

// Phones: the preview beside the tabs, the list below. From md: the preview in a column of its own.
const LAYOUT = [
  'grid min-h-0 flex-1 gap-3',
  "grid-cols-[7rem_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] [grid-template-areas:'preview_tabs'_'list_list']",
  'sm:grid-cols-[9rem_minmax(0,1fr)]',
  "md:grid-cols-[14rem_minmax(0,1fr)] md:gap-4 md:[grid-template-areas:'preview_tabs'_'preview_list']",
].join(' ');

function priceLabel(item: CosmeticItem) {
  if (item.festival) {
    const { token } = FESTIVALS[item.festival];
    return `${token.icon} ${item.priceTokens ?? 0} ${token.name}`;
  }
  if (item.priceGold > 0 && item.priceGems > 0) {
    return `🪙 ${item.priceGold} + 💎 ${item.priceGems}`;
  }
  if (item.priceGems > 0) return `💎 ${item.priceGems} Kim Cương`;
  return `🪙 ${item.priceGold} Vàng`;
}

export function WardrobeModal() {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const cosmetics = useGameStore((s) => s.cosmetics);
  const ownedCosmetics = useGameStore((s) => s.ownedCosmetics);
  const decorPlacements = useGameStore((s) => s.decorPlacements);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const buyOrEquipCosmetic = useGameStore((s) => s.buyOrEquipCosmetic);
  const startPlacingDecor = useGameStore((s) => s.startPlacingDecor);
  const storeDecor = useGameStore((s) => s.storeDecor);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const [tabId, setTabId] = useState(TABS[0].id);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  // Festival items show up while their festival runs, and afterwards only for those who own them
  const festival = activeFestival(todayKey())?.id;
  const items = COSMETICS.filter(
    (c) =>
      tab.categories.includes(c.category) &&
      (!c.festival || c.festival === festival || ownedCosmetics.includes(c.id))
  );
  const isDecorTab = tab.id === 'farmDecor';

  // Hovering an item tries it on in the preview without buying it
  const previewItem = COSMETICS.find((c) => c.id === previewId);
  const previewDecor =
    previewItem?.category === 'decor' ? previewItem.id : isDecorTab ? items[0]?.id ?? null : null;
  const previewCosmetics =
    previewItem && previewItem.category !== 'decor'
      ? { ...cosmetics, [previewItem.category]: previewItem.id }
      : cosmetics;
  const previewName = previewItem ?? (isDecorTab ? items[0] : undefined);
  const caption = previewName ? `👀 Xem thử: ${previewName.icon} ${previewName.name}` : '🧍 Trang phục đang mặc';

  return (
    <ModalShell
      icon="👗"
      title="Cửa Hàng Thời Trang & Trang Trí"
      subtitle="Mặc thử mũ, quần áo, cánh thiên thần, thú cưng Shiba và nâng cấp nông trại!"
      maxWidth="max-w-5xl"
      headerRight={
        <>
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-900 px-3 py-1 text-xs font-black text-yellow-300 sm:text-sm">
            🪙 {gold}
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-sky-900 px-3 py-1 text-xs font-black text-sky-300 sm:text-sm">
            💎 {gems}
          </div>
        </>
      }
    >
      <div className={LAYOUT}>
        <div className="flex flex-col gap-2 [grid-area:preview]">
          <div className="h-28 overflow-hidden rounded-2xl border-2 border-amber-700/40 bg-gradient-to-b from-sky-200 to-amber-100 sm:h-36 md:h-72">
            <ItemPreview cosmetics={previewCosmetics} decorId={previewDecor} />
          </div>
          <div className="hidden text-center text-xs font-black text-amber-900 md:block">{caption}</div>
          <div className="hidden text-center text-[11px] font-bold text-amber-700 md:block">
            Rê chuột lên món đồ để mặc thử trước khi mua
          </div>
        </div>

        <div className="flex flex-col gap-2 [grid-area:tabs]">
          <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-wrap md:gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTabId(t.id);
                  setPreviewId(null);
                }}
                className={`game-btn whitespace-nowrap rounded-xl px-2 py-1.5 text-xs font-black md:px-3.5 md:text-sm ${
                  tabId === t.id ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
                }`}
              >
                {t.icon} <span className="md:hidden">{t.short}</span>
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
          </div>
          {/* On a phone the caption goes under the tabs, beside the preview */}
          <div className="text-[11px] font-black leading-snug text-amber-900 md:hidden">{caption}</div>
        </div>

        <div className="flex min-h-0 flex-col [grid-area:list]">

          {isDecorTab && currentWorld !== 'farm' && (
            <div className="mb-3 rounded-xl border-2 border-amber-600/40 bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
              🏡 Về Nông Trại để đặt hoặc di chuyển đồ trang trí. Đồ mua ở đây sẽ được cất vào kho.
            </div>
          )}

          <div className="grid min-h-0 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {isDecorTab && <BuildShop />}
            {items.map((item) => {
              const isDecor = item.category === 'decor';
              const owned = ownedCosmetics.includes(item.id);
              const placed = !!decorPlacements[item.id];
              const equipped = isDecor
                ? placed
                : cosmetics[item.category as keyof typeof cosmetics] === item.id;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setPreviewId(item.id)}
                  onClick={() => setPreviewId(item.id)}
                  className={`flex flex-col justify-between gap-2 rounded-2xl border-2 p-3 sm:p-3.5 ${
                    equipped
                      ? 'border-emerald-600 bg-yellow-100 shadow-md'
                      : previewId === item.id
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-amber-700/40 bg-amber-100/90'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-700 bg-amber-300/80 text-2xl">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm font-black text-amber-950">{item.name}</div>
                      <p className="mt-0.5 text-[11px] font-bold text-amber-800">
                        {item.description}
                      </p>
                      {item.perk && (
                        <p className="mt-1 rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[11px] font-black text-emerald-800">
                          {item.perk}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-amber-700/20 pt-2">
                    <span
                      className={`text-xs font-black ${owned ? 'text-emerald-700' : 'text-amber-900'}`}
                    >
                      {!owned
                        ? priceLabel(item)
                        : isDecor
                        ? placed
                          ? '✓ Đang đặt'
                          : '📦 Trong kho'
                        : '✓ Đã sở hữu'}
                    </span>

                    {isDecor && owned ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => startPlacingDecor(item.id)}
                          className={`game-btn rounded-xl px-2.5 py-1.5 text-xs font-black text-white ${
                            placed ? 'bg-sky-600' : 'bg-emerald-600'
                          }`}
                        >
                          {placed ? 'Di Chuyển' : 'Đặt Ra Nông Trại'}
                        </button>
                        {placed && (
                          <button
                            onClick={() => storeDecor(item.id)}
                            className="game-btn rounded-xl bg-slate-600 px-2.5 py-1.5 text-xs font-black text-white"
                          >
                            Cất
                          </button>
                        )}
                      </div>
                    ) : !owned && item.festival ? (
                      <button
                        onClick={() => setActiveModal('festivalShop')}
                        className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black text-white ${
                          FESTIVALS[item.festival].ui.button
                        }`}
                      >
                        {FESTIVALS[item.festival].token.icon} Đổi Quà
                      </button>
                    ) : (
                      <button
                        onClick={() => buyOrEquipCosmetic(item.id)}
                        className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black ${
                          equipped
                            ? 'bg-slate-700 text-white'
                            : owned
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {equipped ? 'Đang Mặc' : owned ? 'Mặc Ngay' : 'Mua Ngay'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
