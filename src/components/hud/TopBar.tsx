'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';
import { TIME_PHASES } from '@/config/time';
import { npcPresetsFor } from '@/config/npcs';
import { countItems } from '@/lib/inventory';
import { levelInfo, levelTitle } from '@/lib/leveling';
import { giftDay, localDateKey } from '@/lib/dailyGift';
import { waterCapacity } from '@/lib/tools';
import { isEventActive } from '@/lib/event';
import { visibleQuests } from '@/lib/quests';
import { SEASONS, SEASON_DAYS, WEATHERS } from '@/config/seasons';
import { dayInSeason, seasonOf, weatherOf } from '@/lib/seasons';
import { SoundSettings } from './SoundSettings';

// The small buttons at the far end, in the bars' turquoise (players, photos, sound: see SoundSettings)
const SYSTEM_BUTTON =
  'game-btn relative flex h-8 items-center justify-center rounded-xl border-2 border-teal-900 bg-teal-600 text-sm text-white hover:bg-teal-500 md:h-9';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-yellow-300';

function Meter({ label, value, max, fill }: { label: string; value: number; max: number; fill: string }) {
  return (
    <div>
      <div className="flex justify-between gap-2 text-[10px] font-extrabold leading-snug">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-amber-950/25 p-0.5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fill} transition-all duration-300`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// Where and when: the zone (opens the map), day, season and weather, next to the buttons that change the time
function TimeCard() {
  const day = useGameStore((s) => s.day);
  const timePhaseIndex = useGameStore((s) => s.timePhaseIndex);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const cycleTimeOfDay = useGameStore((s) => s.cycleTimeOfDay);
  const nextDay = useGameStore((s) => s.nextDay);
  const worldCfg = WORLDS[currentWorld];
  const season = SEASONS[seasonOf(day)];
  const weather = WEATHERS[weatherOf(day)];

  return (
    <div className="parchment-panel pointer-events-auto flex items-center gap-2 rounded-2xl px-1.5 py-1.5 sm:gap-2.5 sm:px-2">
      <button
        onClick={() => setActiveModal('map')}
        title="Bản Đồ Thế Giới (phím M)"
        className={`flex items-center gap-2 rounded-xl text-left transition hover:brightness-105 active:scale-95 sm:gap-2.5 ${FOCUS_RING}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg text-white shadow-inner">
          {worldCfg.icon}
        </span>
        <span className="block">
          <span className="block text-sm font-black leading-none text-amber-950 sm:text-base">
            {worldCfg.name}
          </span>
          <span className="mt-1 block text-[11px] font-bold leading-tight text-amber-800">
            Ngày {day} • {TIME_PHASES[timePhaseIndex].label}
          </span>
          <span className="block text-[10px] font-bold leading-tight text-amber-700">
            {season.icon} {season.name} {dayInSeason(day)}/{SEASON_DAYS} • {weather.icon} {weather.name}
          </span>
        </span>
      </button>
      <span aria-hidden className="w-px self-stretch bg-amber-800/25" />
      <div className="flex gap-1 md:flex-col">
        <button
          onClick={cycleTimeOfDay}
          title="Đổi giờ: Sáng → Trưa → Hoàng Hôn → Đêm"
          aria-label="Đổi giờ trong ngày"
          className="game-btn flex h-8 w-8 items-center justify-center rounded-lg border-2 border-indigo-950 bg-indigo-600 text-sm hover:bg-indigo-500 md:h-[22px] md:text-xs"
        >
          🌤️
        </button>
        <button
          onClick={nextDay}
          title="Ngủ qua ngày mới"
          aria-label="Ngủ qua ngày mới"
          className="game-btn flex h-8 w-8 items-center justify-center rounded-lg border-2 border-purple-950 bg-purple-700 text-sm hover:bg-purple-600 md:h-[22px] md:text-xs"
        >
          🛌
        </button>
      </div>
    </div>
  );
}

// The farmer: level and XP (opens the daily gift), stamina and the water left in the can
function FarmerCard() {
  const xp = useGameStore((s) => s.xp);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const water = useGameStore((s) => s.water);
  const maxWater = useGameStore((s) => waterCapacity(s.toolTiers.water));
  const giftReady = useGameStore(
    (s) => giftDay(s.lastGiftDate, s.loginStreak, localDateKey(new Date())) !== null
  );
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const { level, into, need } = levelInfo(xp);
  const title = levelTitle(level);

  return (
    <div className="parchment-panel pointer-events-auto flex items-center gap-2 rounded-2xl px-2 py-1.5 sm:gap-2.5 sm:px-2.5">
      <button
        onClick={() => setActiveModal('dailyGift')}
        title={`${title} • ${need ? `${into}/${need} XP` : 'Cấp tối đa'} • Quà hằng ngày`}
        aria-label={`Cấp ${level}, ${title}: cấp độ và quà hằng ngày`}
        className={`relative flex shrink-0 flex-col items-center gap-1 rounded-xl transition hover:brightness-105 active:scale-95 ${FOCUS_RING}`}
      >
        <span className="flex h-9 w-9 flex-col items-center justify-center rounded-xl bg-orange-500 text-white shadow-inner">
          <span className="text-[8px] font-black leading-none">CẤP</span>
          <span className="text-sm font-black leading-none">{level}</span>
        </span>
        <span className="block h-1.5 w-9 overflow-hidden rounded-full bg-amber-950/25">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            style={{ width: need ? `${(into / need) * 100}%` : '100%' }}
          />
        </span>
        {giftReady && (
          <span className="absolute -right-2.5 -top-2.5 animate-bounce text-base" title="Có quà hôm nay!">
            🎁
          </span>
        )}
      </button>
      <div className="flex w-24 flex-col gap-1 sm:w-32">
        <Meter label="⚡ Thể lực" value={energy} max={maxEnergy} fill="from-lime-500 to-emerald-500" />
        <Meter label="💧 Bình tưới" value={water} max={maxWater} fill="from-sky-400 to-blue-600" />
      </div>
    </div>
  );
}

function Coin({ icon, label, value, valueClass }: { icon: string; label: string; value: number; valueClass: string }) {
  return (
    <div className="flex items-center gap-1.5" title={label} aria-label={`${label}: ${value}`}>
      <span className="text-sm leading-none sm:text-base">{icon}</span>
      <span className={`text-sm font-black leading-tight tabular-nums sm:text-base ${valueClass}`}>{value}</span>
    </div>
  );
}

// Gold over gems and, while Lễ Hội Bí Ngô runs, candy (which opens the candy shop)
function Wallet() {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const candy = useGameStore((s) => s.candy);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const festival = isEventActive(localDateKey(new Date()));

  return (
    <div className="parchment-panel pointer-events-auto flex items-center gap-2.5 rounded-2xl px-2.5 py-1.5">
      <div className="flex flex-col gap-0.5">
        <Coin icon="🪙" label="Vàng" value={gold} valueClass="text-amber-950" />
        <Coin icon="💎" label="Kim Cương" value={gems} valueClass="text-sky-900" />
      </div>
      {festival && (
        <button
          onClick={() => setActiveModal('candyShop')}
          title={`Kẹo Lễ Hội Bí Ngô: ${candy} (mở Tiệm Kẹo Ma Quái)`}
          aria-label={`Kẹo: ${candy}, mở Tiệm Kẹo Ma Quái`}
          className="game-btn flex items-center gap-1 self-center rounded-xl border-2 border-purple-950 bg-purple-700 px-2 py-1.5 text-white hover:bg-purple-600"
        >
          <span className="text-base leading-none">🍬</span>
          <span className="text-sm font-black leading-none tabular-nums">{candy}</span>
        </button>
      )}
    </div>
  );
}

function Badge({ children, bounce = false }: { children: ReactNode; bounce?: boolean }) {
  return (
    <span
      className={`absolute -right-1.5 -top-1.5 rounded-full border border-white bg-red-600 px-1.5 text-[10px] font-black leading-4 text-white ${
        bounce ? 'animate-bounce' : ''
      }`}
    >
      {children}
    </span>
  );
}

// A menu tile: icon over a short label (icon only on phones); the full name and shortcut are in the tooltip
function MenuButton({
  icon,
  label,
  name,
  hotkey,
  color,
  onClick,
  badge,
}: {
  icon: string;
  label: string;
  name: string;
  hotkey?: string;
  color: string;
  onClick: () => void;
  badge?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={hotkey ? `${name} (phím ${hotkey})` : name}
      aria-label={name}
      className={`game-btn relative flex h-10 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 sm:h-[50px] sm:min-w-[54px] sm:flex-none sm:px-1 ${color}`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="hidden whitespace-nowrap text-[10px] font-extrabold leading-none [text-shadow:0_1px_0_rgba(0,0,0,0.2)] sm:block">
        {label}
      </span>
      {badge}
    </button>
  );
}

// Groove between the groups on the tray
const TrayDivider = () => (
  <span aria-hidden className="w-0.5 shrink-0 self-stretch rounded-full bg-black/30 sm:mx-0.5" />
);

// The game's menus on one tray: getting around, the farm, shopping
function MenuTray() {
  const quests = useGameStore((s) => s.quests);
  const storedCount = useGameStore((s) => countItems(s.items) + countItems(s.shippingBin));
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const openExpand = useGameStore((s) => s.openExpand);
  const openWorkshop = useGameStore((s) => s.openWorkshop);
  const festival = isEventActive(localDateKey(new Date()));
  const hasClaimable = visibleQuests(quests, festival).some((q) => !q.claimed && q.progress >= q.target);

  return (
    <nav
      aria-label="Menu trò chơi"
      className="bar-panel pointer-events-auto flex w-full items-stretch gap-1 rounded-2xl p-1 sm:w-auto sm:p-1.5"
    >
      <MenuButton
        icon="🗺️"
        label="Bản Đồ"
        name="Bản Đồ Thế Giới"
        hotkey="M"
        color="border-sky-950 bg-sky-700 text-white hover:bg-sky-600"
        onClick={() => setActiveModal('map')}
      />
      <MenuButton
        icon="📜"
        label="Nhiệm Vụ"
        name="Nhiệm Vụ"
        hotkey="Q"
        color="border-amber-900 bg-amber-500 text-amber-950 hover:bg-amber-400"
        onClick={() => setActiveModal('quests')}
        badge={hasClaimable && <Badge bounce>!</Badge>}
      />
      <TrayDivider />
      <MenuButton
        icon="🎒"
        label="Kho"
        name="Kho Đồ & Rương Bán Hàng"
        color="border-orange-950 bg-orange-700 text-white hover:bg-orange-600"
        onClick={() => setActiveModal('inventory')}
        badge={storedCount > 0 && <Badge>{storedCount}</Badge>}
      />
      <MenuButton
        icon="🐄"
        label="Chăn Nuôi"
        name="Chuồng Trại Chăn Nuôi"
        hotkey="R"
        color="border-rose-950 bg-rose-600 text-white hover:bg-rose-500"
        onClick={() => setActiveModal('ranch')}
      />
      <MenuButton
        icon="🏭"
        label="Xưởng"
        name="Xưởng Chế Biến"
        hotkey="X"
        color="border-yellow-900 bg-yellow-500 text-yellow-950 hover:bg-yellow-400"
        onClick={() => openWorkshop()}
      />
      <MenuButton
        icon="🏗️"
        label="Mở Rộng"
        name="Mở Rộng Nông Trại"
        color="border-lime-950 bg-lime-700 text-white hover:bg-lime-600"
        onClick={() => openExpand()}
      />
      <TrayDivider />
      <MenuButton
        icon="🌱"
        label="Hạt Giống"
        name="Tạp Hóa Hạt Giống"
        hotkey="B"
        color="border-emerald-950 bg-emerald-700 text-white hover:bg-emerald-600"
        onClick={() => setActiveModal('shop')}
      />
      <MenuButton
        icon="👗"
        label="Thời Trang"
        name="Thời Trang & Decor"
        hotkey="C"
        color="border-pink-950 bg-pink-600 text-white hover:bg-pink-500"
        onClick={() => setActiveModal('wardrobe')}
      />
    </nav>
  );
}

// Quiet utilities: players online & profile, photo mode, sound. A column in the corner on phones.
function SystemButtons() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const signedIn = useGameStore((s) => !!s.userProfile);
  const cloudError = useGameStore((s) => !!s.cloudError);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode);
  const onlineCount = 1 + Object.keys(remotePlayers).length + npcPresetsFor(currentWorld).length;

  return (
    <div className="pointer-events-auto absolute right-2 top-2 flex flex-col items-end gap-1 sm:right-3 sm:top-3 md:static md:flex-row md:items-center">
      <button
        onClick={() => setActiveModal('auth')}
        title={`Hồ sơ & sảnh người chơi: ${onlineCount} người đang online`}
        aria-label={`Hồ sơ và người chơi, ${onlineCount} người đang online`}
        className={`${SYSTEM_BUTTON} gap-1 px-2`}
      >
        <i className="fa-solid fa-users text-xs" />
        <span className="text-[11px] font-black tabular-nums">{onlineCount}</span>
        {signedIn && (
          <span
            title={cloudError ? 'Đồng bộ Cloud lỗi' : 'Đã đăng nhập Cloud'}
            className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white ${
              cloudError ? 'bg-red-500' : 'bg-emerald-400'
            }`}
          />
        )}
      </button>
      <button
        onClick={togglePhotoMode}
        title="Chế độ chụp ảnh (phím P)"
        aria-label="Chế độ chụp ảnh"
        className={`${SYSTEM_BUTTON} w-8 md:w-9`}
      >
        📷
      </button>
      <SoundSettings />
    </div>
  );
}

export function TopBar() {
  const headerRef = useRef<HTMLElement>(null);

  // The quest tracker sits just below the bar, however many rows it wraps into
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty('--hud-top', `${header.offsetHeight}px`)
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className="pointer-events-none fixed left-0 right-0 top-0 z-20 flex flex-wrap items-start gap-2 p-2 sm:p-3 md:gap-3"
    >
      {/* Status on the left; on phones it leaves room for the system buttons in the corner */}
      <div className="flex flex-wrap items-stretch gap-2 pr-12 md:pr-0">
        <TimeCard />
        <FarmerCard />
        <Wallet />
      </div>

      {/* Menus and utilities on the right; on phones the menus take a row of their own */}
      <div className="flex w-full items-center justify-center gap-3 md:ml-auto md:w-auto">
        <MenuTray />
        <SystemButtons />
      </div>
    </header>
  );
}
