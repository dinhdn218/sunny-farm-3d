'use client';

import { ReactNode } from 'react';
import { SNACK_PRICE, useGameStore } from '@/store/useGameStore';
import { useCasinoStore } from '@/store/useCasinoStore';
import { WORLDS } from '@/config/worlds';
import { SNACKS, ZONE_SPOTS, ZoneSpot } from '@/config/zones';
import { FISHING_ENERGY } from '@/config/fish';
import { CLAW_PRICE } from '@/config/claw';
import { BEACH_FINDS_PER_DAY } from '@/config/forage';
import { TABLE_LIST, humans } from '@/lib/casino';
import { goToTable } from '@/lib/casinoNet';
import { isEventActive } from '@/lib/event';
import { localDateKey } from '@/lib/dailyGift';

function ZoneButton({
  onClick,
  color,
  disabled = false,
  children,
}: {
  onClick: () => void;
  color: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`game-btn mb-1.5 w-full rounded-xl py-1.5 text-xs font-black text-white disabled:bg-slate-500 ${color}`}
    >
      {children}
    </button>
  );
}

// Shortcuts to what there is to do in a public zone; each walks the player over first
export function ZonePanel() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const walkTo = useGameStore((s) => s.walkTo);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const eat = useGameStore((s) => s.eatPopcornOrSnack);
  const goFishing = useGameStore((s) => s.goFishing);
  const cycleCinemaChannel = useGameStore((s) => s.cycleCinemaChannel);
  const triggerEmote = useGameStore((s) => s.triggerEmote);
  const fishing = useGameStore((s) => !!s.fishing);
  const snackFree = useGameStore((s) => s.lastFreeSnackDay !== s.day);
  const findsLeft = useGameStore(
    (s) => BEACH_FINDS_PER_DAY - (s.beachDay === s.day ? s.beachTaken.length : 0)
  );
  const wheelReady = useGameStore((s) => s.lastWheelDate !== localDateKey(new Date()));
  const tables = useCasinoStore((s) => s.tables);
  const festival = isEventActive(localDateKey(new Date()));
  const world = WORLDS[currentWorld];

  const go = (spot: ZoneSpot, act: () => void) => walkTo({ ...spot, act });
  const snackLabel = (snack: (typeof SNACKS)[keyof typeof SNACKS]) =>
    `${snack.icon} ${snack.label} (+${snack.energy}⚡ • ${snackFree ? 'Miễn phí' : `🪙${SNACK_PRICE}`})`;
  const fishButton = (where: string) => (
    <ZoneButton onClick={goFishing} disabled={fishing} color="bg-sky-600 hover:bg-sky-500">
      🎣 Câu Cá ở {where} (-{FISHING_ENERGY}⚡)
    </ZoneButton>
  );
  const journalButton = (
    <ZoneButton onClick={() => setActiveModal('fishJournal')} color="bg-amber-600 hover:bg-amber-500">
      📖 Sổ Tay Câu Cá
    </ZoneButton>
  );

  return (
    <div className="glass-panel pointer-events-auto rounded-2xl p-3 text-white">
      <div className="mb-1.5 text-xs font-black text-amber-300">
        {world.icon} {world.name}
      </div>

      {currentWorld === 'park' && (
        <>
          {fishButton('Hồ Sen')}
          <ZoneButton
            onClick={() => go(ZONE_SPOTS.parkIceCream, () => eat(SNACKS.iceCream.label, SNACKS.iceCream.energy))}
            color="bg-pink-500 hover:bg-pink-400"
          >
            {snackLabel(SNACKS.iceCream)}
          </ZoneButton>
          {journalButton}
          {festival && (
            <ZoneButton onClick={() => setActiveModal('candyShop')} color="bg-purple-600 hover:bg-purple-500">
              🍬 Tiệm Kẹo Ma Quái
            </ZoneButton>
          )}
        </>
      )}

      {currentWorld === 'beach' && (
        <>
          {fishButton('Cầu Cảng')}
          <ZoneButton
            onClick={() => go(ZONE_SPOTS.beachCoconut, () => eat(SNACKS.coconut.label, SNACKS.coconut.energy))}
            color="bg-lime-600 hover:bg-lime-500"
          >
            {snackLabel(SNACKS.coconut)}
          </ZoneButton>
          <div className="mb-1.5 rounded-xl bg-white/10 px-2 py-1 text-[11px] font-bold text-amber-100">
            🐚 Đồ nhặt trên cát hôm nay: còn {findsLeft}/{BEACH_FINDS_PER_DAY} • tìm chỗ lấp lánh!
          </div>
          {journalButton}
        </>
      )}

      {currentWorld === 'mall' && (
        <>
          <ZoneButton onClick={() => go(ZONE_SPOTS.mallMarket, () => setActiveModal('market'))} color="bg-rose-500 hover:bg-rose-400">
            🧺 Chợ Phiên Nông Sản
          </ZoneButton>
          <ZoneButton
            onClick={() => go(ZONE_SPOTS.mallBubbleTea, () => eat(SNACKS.bubbleTea.label, SNACKS.bubbleTea.energy))}
            color="bg-purple-600 hover:bg-purple-500"
          >
            {snackLabel(SNACKS.bubbleTea)}
          </ZoneButton>
          <ZoneButton onClick={() => setActiveModal('wardrobe')} color="bg-pink-600 hover:bg-pink-500">
            👗 Mở Tủ Đồ & Mua Sắm
          </ZoneButton>
          <ZoneButton
            onClick={() => triggerEmote('💃', 'Biểu diễn thời trang trên sàn Runway!')}
            color="bg-fuchsia-600 hover:bg-fuchsia-500"
          >
            ✨ Tạo Dáng Trên Sàn Runway
          </ZoneButton>
        </>
      )}

      {currentWorld === 'cinema' && (
        <>
          <ZoneButton onClick={cycleCinemaChannel} color="bg-pink-600 hover:bg-pink-500">
            📺 Đổi Kênh Phim Đang Chiếu
          </ZoneButton>
          <ZoneButton
            onClick={() => go(ZONE_SPOTS.cinemaPopcorn, () => eat(SNACKS.popcorn.label, SNACKS.popcorn.energy))}
            color="bg-amber-500 hover:bg-amber-400"
          >
            {snackLabel(SNACKS.popcorn)}
          </ZoneButton>
          <ZoneButton onClick={() => go(ZONE_SPOTS.cinemaClaw, () => setActiveModal('claw'))} color="bg-fuchsia-600 hover:bg-fuchsia-500">
            🕹️ Máy Gắp Thú ({CLAW_PRICE}🪙 / lượt)
          </ZoneButton>
        </>
      )}

      {currentWorld === 'casino' && (
        <>
          {TABLE_LIST.map((t) => {
            const state = tables[t.id];
            return (
              <ZoneButton key={t.id} onClick={() => goToTable(t.id)} color="bg-emerald-700 hover:bg-emerald-600">
                🃏 {t.name} • {t.stake}🪙 • {state ? `${humans(state).length}/4 người` : 'Trống'}
              </ZoneButton>
            );
          })}
          <ZoneButton onClick={() => go(ZONE_SPOTS.casinoWheel, () => setActiveModal('luckyWheel'))} color="bg-pink-600 hover:bg-pink-500">
            🎡 Vòng Quay May Mắn{wheelReady ? ' • 1 lượt miễn phí!' : ''}
          </ZoneButton>
        </>
      )}

      <button
        onClick={() => setActiveModal('map')}
        className="game-btn w-full rounded-xl bg-emerald-600 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
      >
        🏡 Về Lại Nông Trại Của Tôi
      </button>
    </div>
  );
}
