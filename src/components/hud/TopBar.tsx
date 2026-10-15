'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';
import { TIME_PHASES } from '@/config/time';
import { npcPresetsFor } from '@/config/npcs';
import { soundFX } from '@/lib/audio';
import { countItems } from '@/lib/inventory';
import { levelInfo, levelTitle } from '@/lib/leveling';
import { giftDay, localDateKey } from '@/lib/dailyGift';
import { waterCapacity } from '@/lib/tools';
import { isEventActive } from '@/lib/event';
import { visibleQuests } from '@/lib/quests';
import { SEASONS, SEASON_DAYS, WEATHERS } from '@/config/seasons';
import { dayInSeason, seasonOf, weatherOf } from '@/lib/seasons';

export function TopBar() {
  const day = useGameStore((s) => s.day);
  const timePhaseIndex = useGameStore((s) => s.timePhaseIndex);
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const water = useGameStore((s) => s.water);
  const maxWater = useGameStore((s) => waterCapacity(s.toolTiers.water));
  const currentWorld = useGameStore((s) => s.currentWorld);
  const quests = useGameStore((s) => s.quests);
  const items = useGameStore((s) => s.items);
  const shippingBin = useGameStore((s) => s.shippingBin);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const xp = useGameStore((s) => s.xp);
  const candy = useGameStore((s) => s.candy);
  const giftReady = useGameStore(
    (s) => giftDay(s.lastGiftDate, s.loginStreak, localDateKey(new Date())) !== null
  );
  const signedIn = useGameStore((s) => !!s.userProfile);
  const cloudError = useGameStore((s) => !!s.cloudError);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const cycleTimeOfDay = useGameStore((s) => s.cycleTimeOfDay);
  const nextDay = useGameStore((s) => s.nextDay);
  const openExpand = useGameStore((s) => s.openExpand);
  const openWorkshop = useGameStore((s) => s.openWorkshop);

  const [muted, setMuted] = useState(soundFX.muted);
  const worldCfg = WORLDS[currentWorld];
  const headerRef = useRef<HTMLElement>(null);

  // The quest tracker sits just below the bar, however many rows the buttons wrap into
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty('--hud-top', `${header.offsetHeight}px`)
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const onlineCount =
    1 + Object.keys(remotePlayers).length + npcPresetsFor(currentWorld).length;
  const storedCount = countItems(items) + countItems(shippingBin);
  const { level, into, need } = levelInfo(xp);
  const festival = isEventActive(localDateKey(new Date()));
  const hasClaimable = visibleQuests(quests, festival).some(
    (q) => !q.claimed && q.progress >= q.target
  );
  const season = SEASONS[seasonOf(day)];
  const weather = WEATHERS[weatherOf(day)];

  return (
    <header ref={headerRef} className="pointer-events-none fixed left-0 right-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-2 sm:p-3">
      {/* Left status group: zone, day/time, gold, gems, stamina */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveModal('map')}
          className="parchment-panel flex items-center gap-2.5 rounded-2xl px-3 py-1.5 transition hover:brightness-105 active:scale-95"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg text-white shadow-inner">
            {worldCfg.icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black leading-none text-amber-950 sm:text-base">
                {worldCfg.name}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-lime-300" />
                {onlineCount} Online
              </span>
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-amber-800">
              Ngày {day} • {TIME_PHASES[timePhaseIndex].label}
            </div>
            <div className="text-[10px] font-bold text-amber-700">
              {season.icon} {season.name} {dayInSeason(day)}/{SEASON_DAYS} • {weather.icon} {weather.name}
            </div>
          </div>
        </button>

        <div className="parchment-panel flex items-center gap-3 rounded-2xl px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🪙</span>
            <div>
              <div className="text-[9px] font-extrabold uppercase leading-none text-amber-800">
                Vàng
              </div>
              <div className="text-sm font-black leading-tight text-amber-950 sm:text-base">
                {gold}
              </div>
            </div>
          </div>
          <div className="h-6 w-0.5 bg-amber-800/25" />
          <div className="flex items-center gap-1.5">
            <span className="text-lg">💎</span>
            <div>
              <div className="text-[9px] font-extrabold uppercase leading-none text-sky-800">
                Kim Cương
              </div>
              <div className="text-sm font-black leading-tight text-sky-900 sm:text-base">
                {gems}
              </div>
            </div>
          </div>
        </div>

        {festival && (
          <button
            onClick={() => setActiveModal('candyShop')}
            title="Lễ Hội Bí Ngô: Tiệm Kẹo Ma Quái"
            className="flex items-center gap-1.5 rounded-2xl border-[3px] border-purple-900 bg-purple-700 px-3 py-1.5 text-white shadow-[0_4px_0_#3b0764] transition hover:brightness-110 active:scale-95"
          >
            <span className="text-lg">🍬</span>
            <div className="text-left">
              <div className="text-[9px] font-extrabold uppercase leading-none text-purple-200">Kẹo</div>
              <div className="text-sm font-black leading-tight sm:text-base">{candy}</div>
            </div>
          </button>
        )}

        <button
          onClick={() => setActiveModal('dailyGift')}
          title="Cấp độ nông dân & Quà hằng ngày"
          className="parchment-panel relative flex items-center gap-2 rounded-2xl px-2.5 py-1.5 transition hover:brightness-105 active:scale-95"
        >
          <div className="flex h-9 w-9 flex-col items-center justify-center rounded-xl bg-orange-500 text-white shadow-inner">
            <span className="text-[8px] font-black leading-none">CẤP</span>
            <span className="text-sm font-black leading-none">{level}</span>
          </div>
          <div className="hidden w-24 text-left md:block">
            <div className="truncate text-[10px] font-extrabold text-amber-900">{levelTitle(level)}</div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-950/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: need ? `${(into / need) * 100}%` : '100%' }}
              />
            </div>
            <div className="text-[9px] font-bold text-amber-800">{need ? `${into}/${need} XP` : 'MAX'}</div>
          </div>
          {giftReady && (
            <span className="absolute -right-1.5 -top-1.5 animate-bounce text-base" title="Có quà hôm nay!">
              🎁
            </span>
          )}
        </button>

        <div className="parchment-panel hidden min-w-[155px] flex-col gap-1 rounded-2xl px-3 py-1.5 sm:flex">
          <div>
            <div className="flex justify-between text-[10px] font-extrabold">
              <span>⚡ Thể lực</span>
              <span>
                {energy}/{maxEnergy}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-amber-950/25 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${(energy / maxEnergy) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-extrabold">
              <span>💧 Bình tưới</span>
              <span>
                {water}/{maxWater}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-950/25 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300"
                style={{ width: `${(water / maxWater) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right action buttons */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => setActiveModal('map')}
          className="game-btn flex items-center gap-1.5 rounded-xl border-2 border-sky-900 bg-sky-600 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-sky-500 sm:text-sm"
        >
          <span>🗺️</span> <span>Bản Đồ Thế Giới</span>
        </button>

        <button
          onClick={() => setActiveModal('quests')}
          className="game-btn relative flex items-center gap-1.5 rounded-xl border-2 border-amber-900 bg-amber-500 px-2.5 py-2 text-xs font-extrabold text-amber-950 hover:bg-amber-400 sm:text-sm"
        >
          <span>📜</span> <span>Nhiệm Vụ</span>
          {hasClaimable && (
            <span className="absolute -right-1.5 -top-1.5 animate-bounce rounded-full border border-white bg-red-600 px-1.5 text-[10px] font-black text-white">
              !
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveModal('wardrobe')}
          className="game-btn flex items-center gap-1.5 rounded-xl border-2 border-pink-900 bg-pink-600 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-pink-500 sm:text-sm"
        >
          <span>👗</span> <span>Thời Trang & Decor</span>
        </button>

        <button
          onClick={() => setActiveModal('shop')}
          className="game-btn flex items-center gap-1.5 rounded-xl border-2 border-emerald-900 bg-emerald-600 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-500 sm:text-sm"
        >
          <span>🌱</span> <span className="hidden md:inline">Hạt Giống</span>
        </button>

        <button
          onClick={() => openExpand()}
          title="Mở Rộng Nông Trại"
          className="game-btn flex items-center gap-1.5 rounded-xl border-2 border-lime-900 bg-lime-600 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-lime-500 sm:text-sm"
        >
          <span>🏗️</span> <span className="hidden md:inline">Mở Rộng</span>
        </button>

        <button
          onClick={() => setActiveModal('ranch')}
          className="game-btn flex items-center gap-1.5 rounded-xl border-2 border-rose-950 bg-rose-600 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-rose-500 sm:text-sm"
        >
          <span>🐄</span> <span className="hidden md:inline">Chăn Nuôi</span>
        </button>

        <button
          onClick={() => openWorkshop()}
          title="Xưởng Chế Biến (Phím X)"
          className="game-btn flex items-center gap-1.5 rounded-xl border-2 border-yellow-900 bg-yellow-500 px-2.5 py-2 text-xs font-extrabold text-yellow-950 hover:bg-yellow-400 sm:text-sm"
        >
          <span>🏭</span> <span className="hidden md:inline">Xưởng</span>
        </button>

        <button
          onClick={() => setActiveModal('inventory')}
          className="game-btn relative flex items-center gap-1.5 rounded-xl border-2 border-orange-900 bg-orange-600 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-orange-500 sm:text-sm"
        >
          <span>🎒</span> <span className="hidden md:inline">Kho</span>
          {storedCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 rounded-full border border-white bg-red-600 px-1.5 text-[10px] font-black text-white">
              {storedCount}
            </span>
          )}
        </button>

        <button
          onClick={cycleTimeOfDay}
          title="Đổi Giờ Sáng/Trưa/Hoàng Hôn/Đêm"
          className="game-btn rounded-xl border-2 border-indigo-950 bg-indigo-600 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-indigo-500 sm:text-sm"
        >
          🌤️
        </button>

        <button
          onClick={nextDay}
          title="Ngủ Qua Ngày Mới"
          className="game-btn flex items-center gap-1 rounded-xl border-2 border-purple-950 bg-purple-700 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-purple-600 sm:text-sm"
        >
          <span>🛌</span> <span className="hidden xl:inline">Qua Ngày</span>
        </button>

        <button
          onClick={() => setActiveModal('auth')}
          title="Danh sách người chơi & Hồ sơ"
          className="game-btn relative flex items-center gap-1 rounded-xl border-2 border-slate-950 bg-slate-800 px-2.5 py-2 text-xs font-extrabold text-amber-200 hover:bg-slate-700 sm:text-sm"
        >
          <i className="fa-solid fa-users" />
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
          onClick={() => {
            soundFX.muted = !muted;
            setMuted(!muted);
          }}
          title="Bật/Tắt Âm Thanh"
          className="game-btn flex h-9 w-9 items-center justify-center rounded-xl border-2 border-amber-950 bg-amber-800 text-sm text-amber-100 hover:bg-amber-700"
        >
          <i className={`fa-solid ${muted ? 'fa-volume-xmark' : 'fa-volume-high'}`} />
        </button>
      </div>
    </header>
  );
}
