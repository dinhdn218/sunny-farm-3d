'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';
import { TIME_PHASES } from '@/config/time';
import { npcPresetsFor } from '@/config/npcs';
import { VISITORS_PER_WORLD } from '@/config/visitors';
import { countItems, hasItems } from '@/lib/inventory';
import { levelInfo, levelTitle } from '@/lib/leveling';
import { giftDay, localDateKey } from '@/lib/dailyGift';
import { waterCapacity } from '@/lib/tools';
import { activeFestival } from '@/lib/festivals';
import { visibleQuests } from '@/lib/quests';
import { SEASONS, SEASON_DAYS, WEATHERS } from '@/config/seasons';
import { dayInSeason, seasonOf, weatherOf } from '@/lib/seasons';
import { BUFFS } from '@/config/food';
import { ITEMS } from '@/config/items';
import { activeBuff, maxEnergyFor } from '@/lib/food';
import { SoundSettings } from './SoundSettings';
import { SYSTEM_BUTTON } from './hudStyles';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-yellow-400';

// Groove between the groups on a bar
function Groove({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`w-0.5 shrink-0 self-stretch rounded-full bg-amber-900/20 ${className}`} />;
}

function Meter({ label, value, max, fill }: { label: string; value: number; max: number; fill: string }) {
  return (
    <div>
      <div className="flex justify-between gap-1 text-[10px] font-extrabold leading-snug">
        <span className="whitespace-nowrap">{label}</span>
        <span className="tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-amber-900/15 p-0.5">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${fill} transition-all duration-300`}
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

// Where and when: the zone (opens the map), day, season and weather, next to the buttons that move time on
function WhereWhen() {
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
    <div className="flex min-w-0 items-center gap-1.5">
      <button
        onClick={() => setActiveModal('map')}
        title={`Bản Đồ Thế Giới (phím M) • ${season.name} • ${weather.name}`}
        className={`flex min-w-0 items-center gap-2 rounded-xl text-left transition hover:brightness-105 active:scale-95 ${FOCUS_RING}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-base text-white shadow-inner">
          {worldCfg.icon}
        </span>
        <span className="block min-w-0">
          <span className="block truncate text-[13px] font-black leading-tight">{worldCfg.name}</span>
          <span className="block truncate text-[10px] font-bold leading-tight text-amber-800">
            Ngày {day} • {TIME_PHASES[timePhaseIndex].label}
          </span>
          <span className="block truncate text-[10px] font-bold leading-tight text-amber-800">
            {season.icon} {season.name} {dayInSeason(day)}/{SEASON_DAYS} • {weather.icon}
            <span className="hidden sm:inline"> {weather.name}</span>
          </span>
        </span>
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          onClick={cycleTimeOfDay}
          title="Đổi giờ: Sáng → Trưa → Hoàng Hôn → Đêm"
          aria-label="Đổi giờ trong ngày"
          className="game-btn flex h-[22px] w-8 items-center justify-center rounded-lg border-2 border-indigo-900 bg-indigo-500 text-[11px] hover:bg-indigo-400"
        >
          🌤️
        </button>
        <button
          onClick={nextDay}
          title="Ngủ qua ngày mới"
          aria-label="Ngủ qua ngày mới"
          className="game-btn flex h-[22px] w-8 items-center justify-center rounded-lg border-2 border-purple-900 bg-purple-600 text-[11px] hover:bg-purple-500"
        >
          🛌
        </button>
      </div>
    </div>
  );
}

// The dish eaten today, in the corner of the farmer's meters: a tap opens the bag, which says what it does
function BuffBadge() {
  const buff = useGameStore((s) => (activeBuff(s.buff, s.day) ? s.buff : null));
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  if (!buff) return null;
  const effect = BUFFS[buff.id];
  const text = `${effect.icon} ${effect.name} (${ITEMS[buff.food].name}): ${effect.effect} đến khi đi ngủ`;
  return (
    <button
      onClick={() => setActiveModal('inventory')}
      title={text}
      aria-label={text}
      className={`absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-400 text-xs shadow ${FOCUS_RING}`}
    >
      {effect.icon}
    </button>
  );
}

// The farmer: level and XP (opens the daily gift), stamina and the water left in the can
function Farmer() {
  const xp = useGameStore((s) => s.xp);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => maxEnergyFor(s.buff, s.day));
  const water = useGameStore((s) => s.water);
  const maxWater = useGameStore((s) => waterCapacity(s.toolTiers.water));
  const giftReady = useGameStore(
    (s) => giftDay(s.lastGiftDate, s.loginStreak, localDateKey(new Date())) !== null
  );
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const { level, into, need } = levelInfo(xp);
  const title = levelTitle(level);

  return (
    <div className="relative flex shrink-0 items-center gap-2">
      <button
        onClick={() => setActiveModal('dailyGift')}
        title={`${title} • ${need ? `${into}/${need} XP` : 'Cấp tối đa'} • Quà hằng ngày`}
        aria-label={`Cấp ${level}, ${title}: cấp độ và quà hằng ngày`}
        className={`relative flex shrink-0 flex-col items-center gap-0.5 rounded-xl transition hover:brightness-105 active:scale-95 ${FOCUS_RING}`}
      >
        <span className="flex h-8 w-8 flex-col items-center justify-center rounded-xl bg-orange-500 text-white shadow-inner">
          <span className="text-[7px] font-black leading-none">CẤP</span>
          <span className="text-sm font-black leading-none">{level}</span>
        </span>
        <span className="block h-1.5 w-8 overflow-hidden rounded-full bg-amber-900/15">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            style={{ width: need ? `${(into / need) * 100}%` : '100%' }}
          />
        </span>
        {giftReady && (
          <span className="absolute -right-2 -top-2.5 animate-bounce text-sm" title="Có quà hôm nay!">
            🎁
          </span>
        )}
      </button>
      <div className="flex w-24 flex-col gap-0.5 sm:w-28">
        <Meter label="⚡ Thể lực" value={energy} max={maxEnergy} fill="from-lime-500 to-emerald-500" />
        <Meter label="💧 Bình tưới" value={water} max={maxWater} fill="from-sky-400 to-blue-600" />
      </div>
      <BuffBadge />
    </div>
  );
}

function Coin({ icon, label, value, valueClass }: { icon: string; label: string; value: number; valueClass: string }) {
  return (
    <div className="flex items-center gap-1.5" title={label} aria-label={`${label}: ${value}`}>
      <span className="text-sm leading-none">{icon}</span>
      <span className={`text-sm font-black leading-tight tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

// Gold over gems and, while a festival runs, its tokens (which open its stall)
function Wallet() {
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const festival = activeFestival(localDateKey(new Date()));
  const tokens = useGameStore((s) => (festival ? s.festivalTokens[festival.id] ?? 0 : 0));
  const setActiveModal = useGameStore((s) => s.setActiveModal);

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col gap-0.5">
        <Coin icon="🪙" label="Vàng" value={gold} valueClass="text-amber-700" />
        <Coin icon="💎" label="Kim Cương" value={gems} valueClass="text-sky-700" />
      </div>
      {festival && (
        <button
          onClick={() => setActiveModal('festivalShop')}
          title={`${festival.token.name} ${festival.name}: ${tokens} (mở ${festival.shop.name})`}
          aria-label={`${festival.token.name}: ${tokens}, mở ${festival.shop.name}`}
          className={`game-btn flex items-center gap-1 self-center rounded-xl border-2 border-black/30 px-2 py-1 text-white ${festival.ui.button}`}
        >
          <span className="text-sm leading-none">{festival.token.icon}</span>
          <span className="text-sm font-black leading-none tabular-nums">{tokens}</span>
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

// A menu tile: icon over a short label where the bar has room for it (1024–1279px, and from 1440px), the icon
// alone elsewhere; the full name and shortcut are in the tooltip
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
      className={`game-btn relative flex h-9 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-2 sm:h-[42px] sm:min-w-[40px] sm:flex-none sm:px-1 lg:min-w-[50px] xl:min-w-[40px] min-[1440px]:min-w-[50px] ${color}`}
    >
      <span className="text-base leading-none sm:text-lg">{icon}</span>
      <span className="hidden whitespace-nowrap text-[10px] font-extrabold leading-none [text-shadow:0_1px_0_rgba(0,0,0,0.2)] lg:block xl:hidden min-[1440px]:block">
        {label}
      </span>
      {badge}
    </button>
  );
}

// The game's menus: getting around, the farm, shopping
function MenuTiles() {
  const quests = useGameStore((s) => s.quests);
  const storedCount = useGameStore((s) => countItems(s.items) + countItems(s.shippingBin));
  // Orders the bag already holds everything for
  const deliverable = useGameStore((s) => s.orders.filter((o) => hasItems(s.items, o.items)).length);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const openExpand = useGameStore((s) => s.openExpand);
  const openWorkshop = useGameStore((s) => s.openWorkshop);
  const festival = activeFestival(localDateKey(new Date()))?.id ?? null;
  const hasClaimable = visibleQuests(quests, festival).some((q) => !q.claimed && q.progress >= q.target);

  return (
    <>
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
      <MenuButton
        icon="📦"
        label="Đơn Hàng"
        name="Bảng Đơn Hàng"
        hotkey="O"
        color="border-violet-950 bg-violet-600 text-white hover:bg-violet-500"
        onClick={() => setActiveModal('orders')}
        badge={deliverable > 0 && <Badge bounce>{deliverable}</Badge>}
      />
      <Groove className="sm:mx-0.5" />
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
      <Groove className="sm:mx-0.5" />
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
    </>
  );
}

// Quiet utilities: players online & profile, mail, leaderboards, photo mode, sound
function SystemButtons() {
  const currentWorld = useGameStore((s) => s.currentWorld);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const signedIn = useGameStore((s) => !!s.userProfile);
  const cloudError = useGameStore((s) => !!s.cloudError);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const togglePhotoMode = useGameStore((s) => s.togglePhotoMode);
  // Letters still unread, or with a gift not yet claimed
  const newMail = useGameStore((s) => s.mail.filter((l) => !l.read || (l.gift && !l.claimed)).length);
  // Everyone about in this zone: you, other players, the residents and the visitors strolling round
  const onlineCount =
    1 + Object.keys(remotePlayers).length + npcPresetsFor(currentWorld).length + VISITORS_PER_WORLD;

  return (
    <>
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
        onClick={() => setActiveModal('mail')}
        title="Hộp Thư"
        aria-label={`Hộp thư, ${newMail} thư mới`}
        className={`${SYSTEM_BUTTON} w-8`}
      >
        ✉️
        {newMail > 0 && <Badge>{newMail}</Badge>}
      </button>
      <button
        onClick={() => setActiveModal('leaderboard')}
        title="Bảng Xếp Hạng"
        aria-label="Bảng xếp hạng"
        className={`${SYSTEM_BUTTON} w-8`}
      >
        🏆
      </button>
      <button
        onClick={togglePhotoMode}
        title="Chế độ chụp ảnh (phím P)"
        aria-label="Chế độ chụp ảnh"
        className={`${SYSTEM_BUTTON} w-8`}
      >
        📷
      </button>
      <SoundSettings />
    </>
  );
}

// The bars in the game's parchment. Phones: status, then purse and utilities, then the menus, a row each.
// From sm two bars of one width, one over the other: status and purse, then menus and utilities.
// From xl the two bars sit side by side on one row.
const HEADER = [
  'pointer-events-none fixed inset-x-0 top-0 z-20 grid gap-x-2 gap-y-1.5 p-2',
  "grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:'status_status'_'wallet_system'_'menu_menu']",
  "sm:grid-cols-[auto_auto_minmax(0,1fr)] sm:gap-x-0 sm:p-3 sm:[grid-template-areas:'status_wallet_.'_'menu_system_.']",
  "xl:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] xl:[grid-template-areas:'status_wallet_._menu_system']",
].join(' ');

// The right half of a joined bar: no left edge, and none of the soft shadow, which would darken the seam
const JOINED_RIGHT =
  'sm:rounded-l-none sm:border-l-0 sm:pl-0 sm:shadow-[0_6px_0_var(--bar-drop),inset_0_2px_0_rgba(255,255,255,0.4)]';

export function TopBar() {
  const headerRef = useRef<HTMLElement>(null);

  // The quest tracker sits just below the bar, however many rows it takes
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
    <header ref={headerRef} className={HEADER}>
      <div className="bar-panel bar-ink pointer-events-auto flex min-w-0 items-center gap-2 rounded-2xl px-2 py-1 [grid-area:status] sm:rounded-r-none sm:border-r-0">
        <WhereWhen />
        <Groove />
        <Farmer />
      </div>
      <div className={`bar-panel bar-ink pointer-events-auto flex items-center gap-2 rounded-2xl px-2 py-1 [grid-area:wallet] ${JOINED_RIGHT}`}>
        <Groove className="hidden sm:block" />
        <Wallet />
      </div>
      <nav
        aria-label="Menu trò chơi"
        className="bar-panel pointer-events-auto flex items-stretch gap-1 rounded-2xl p-1 [grid-area:menu] sm:rounded-r-none sm:border-r-0"
      >
        <MenuTiles />
      </nav>
      <div className={`bar-panel pointer-events-auto flex items-center gap-1 rounded-2xl p-1 [grid-area:system] ${JOINED_RIGHT}`}>
        <Groove className="mr-0.5 hidden sm:block" />
        <SystemButtons />
      </div>
    </header>
  );
}
