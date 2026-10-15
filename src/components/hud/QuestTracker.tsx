'use client';

import { SNACK_PRICE, useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';
import { QuestCategory } from '@/types/game';
import { activeMainQuest, isClaimable, visibleQuests } from '@/lib/quests';
import { isEventActive } from '@/lib/event';
import { localDateKey } from '@/lib/dailyGift';

const CATEGORY_TAG: Record<QuestCategory, string> = {
  main: '📖',
  daily: '📅',
  achievement: '🏆',
  event: '🎃',
};

export function QuestTracker() {
  const allQuests = useGameStore((s) => s.quests);
  const festival = isEventActive(localDateKey(new Date()));
  const quests = visibleQuests(allQuests, festival);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const claimQuest = useGameStore((s) => s.claimQuest);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const cycleCinemaChannel = useGameStore((s) => s.cycleCinemaChannel);
  const eatPopcornOrSnack = useGameStore((s) => s.eatPopcornOrSnack);
  const triggerEmote = useGameStore((s) => s.triggerEmote);
  const snackFree = useGameStore((s) => s.lastFreeSnackDay !== s.day);
  const startFishing = useGameStore((s) => s.startFishing);
  const fishing = useGameStore((s) => !!s.fishing);

  // Rewards waiting first, then the current story quest, then today's dailies
  const mainQuest = activeMainQuest(quests);
  const shownQuests = [
    ...quests.filter(isClaimable),
    ...(mainQuest ? [mainQuest] : []),
    ...quests.filter((q) => q.category === 'daily' && !q.claimed),
  ]
    .filter((q, i, list) => list.findIndex((other) => other.id === q.id) === i)
    .slice(0, 3);
  const worldCfg = WORLDS[currentWorld];

  return (
    <aside className="pointer-events-none fixed left-3 top-20 z-20 flex max-w-[260px] flex-col gap-2">
      {/* Mini quest tracker */}
      <div className="glass-panel pointer-events-auto rounded-2xl p-3 text-white">
        <div className="mb-2 flex items-center justify-between border-b border-white/15 pb-1.5">
          <span className="flex items-center gap-1.5 text-xs font-black text-amber-300">
            <i className="fa-solid fa-list-check" /> Nhiệm Vụ Đang Làm
          </span>
          <button
            onClick={() => setActiveModal('quests')}
            className="text-[11px] font-bold text-sky-300 hover:underline"
          >
            Tất cả ➔
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shownQuests.length === 0 ? (
            <div className="font-bold text-emerald-300">
              🎉 Bạn đã hoàn thành xuất sắc mọi nhiệm vụ!
            </div>
          ) : (
            shownQuests.map((q) => {
              const ready = isClaimable(q);
              const pct = Math.min(100, (q.progress / q.target) * 100);
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-white/10 bg-slate-800/80 p-2"
                >
                  <div className="flex items-center justify-between gap-1 font-extrabold">
                    <span className="truncate text-amber-200">
                      <span className="mr-1 text-[10px]">{CATEGORY_TAG[q.category]}</span>
                      {q.icon} {q.title}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] ${ready ? 'text-lime-300' : 'text-slate-300'}`}
                    >
                      {Math.min(q.progress, q.target)}/{q.target}
                    </span>
                  </div>
                  <div className="my-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-950">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-lime-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {ready ? (
                    <button
                      onClick={() => claimQuest(q.id)}
                      className="mt-1 w-full rounded-lg bg-emerald-500 py-1 text-[11px] font-black text-slate-950 hover:bg-emerald-400"
                    >
                      🎁 Nhận +{q.rewardGold}🪙 +{q.rewardGems}💎
                    </button>
                  ) : (
                    <div className="truncate text-[10px] text-slate-300">{q.desc}</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Zone actions (hidden on the farm, where the hotbar takes over) */}
      {currentWorld !== 'farm' && (
        <div className="glass-panel pointer-events-auto rounded-2xl p-3 text-white">
          {currentWorld === 'cinema' ? (
            <>
              <div className="mb-1.5 text-xs font-black text-amber-300">
                🎬 Điều Khiển Rạp Phim 3D
              </div>
              <button
                onClick={cycleCinemaChannel}
                className="game-btn mb-1.5 w-full rounded-xl bg-pink-600 py-1.5 text-xs font-black text-white hover:bg-pink-500"
              >
                📺 Đổi Kênh Phim Đang Chiếu
              </button>
              <button
                onClick={() => eatPopcornOrSnack('Bắp rang bơ', 30)}
                className="game-btn w-full rounded-xl bg-amber-500 py-1.5 text-xs font-black text-amber-950 hover:bg-amber-400"
              >
                🍿 Ăn Bắp Rang Bơ (+30⚡ • {snackFree ? 'Miễn phí' : `🪙${SNACK_PRICE}`})
              </button>
            </>
          ) : currentWorld === 'mall' ? (
            <>
              <div className="mb-1.5 text-xs font-black text-pink-300">
                🛍️ Trung Tâm Thương Mại
              </div>
              <button
                onClick={() => setActiveModal('market')}
                className="game-btn mb-1.5 w-full rounded-xl bg-rose-500 py-1.5 text-xs font-black text-white hover:bg-rose-400"
              >
                🧺 Chợ Phiên Nông Sản
              </button>
              <button
                onClick={() => setActiveModal('wardrobe')}
                className="game-btn mb-1.5 w-full rounded-xl bg-pink-600 py-1.5 text-xs font-black text-white hover:bg-pink-500"
              >
                👗 Mở Tủ Đồ & Mua Sắm
              </button>
              <button
                onClick={() =>
                  triggerEmote('💃', 'Biểu diễn thời trang trên sàn Runway!')
                }
                className="game-btn w-full rounded-xl bg-purple-600 py-1.5 text-xs font-black text-white hover:bg-purple-500"
              >
                ✨ Tạo Dáng Trên Sàn Runway
              </button>
            </>
          ) : currentWorld === 'beach' ? (
            <>
              <div className="mb-1.5 text-xs font-black text-sky-300">
                {worldCfg.icon} {worldCfg.name}
              </div>
              <button
                onClick={startFishing}
                disabled={fishing}
                className="game-btn mb-1.5 w-full rounded-xl bg-sky-600 py-1.5 text-xs font-black text-white hover:bg-sky-500 disabled:bg-slate-500"
              >
                🎣 Câu Cá ở Cầu Phía Bắc (-4⚡)
              </button>
              <button
                onClick={() => setActiveModal('fishJournal')}
                className="game-btn mb-1.5 w-full rounded-xl bg-amber-600 py-1.5 text-xs font-black text-white hover:bg-amber-500"
              >
                📖 Sổ Tay Câu Cá
              </button>
              <button
                onClick={() => setActiveModal('map')}
                className="game-btn w-full rounded-xl bg-emerald-600 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
              >
                🏡 Về Lại Nông Trại Của Tôi
              </button>
            </>
          ) : (
            <>
              <div className="mb-1.5 text-xs font-black text-sky-300">
                {worldCfg.icon} {worldCfg.name}
              </div>
              {currentWorld === 'park' && festival && (
                <button
                  onClick={() => setActiveModal('candyShop')}
                  className="game-btn mb-1.5 w-full rounded-xl bg-purple-600 py-1.5 text-xs font-black text-white hover:bg-purple-500"
                >
                  🍬 Tiệm Kẹo Ma Quái
                </button>
              )}
              <button
                onClick={() => setActiveModal('map')}
                className="game-btn w-full rounded-xl bg-emerald-600 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
              >
                🏡 Về Lại Nông Trại Của Tôi
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
