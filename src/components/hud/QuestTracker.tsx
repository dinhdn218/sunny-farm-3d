'use client';

import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';

export function QuestTracker() {
  const quests = useGameStore((s) => s.quests);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const claimQuest = useGameStore((s) => s.claimQuest);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const cycleCinemaChannel = useGameStore((s) => s.cycleCinemaChannel);
  const eatPopcornOrSnack = useGameStore((s) => s.eatPopcornOrSnack);
  const triggerEmote = useGameStore((s) => s.triggerEmote);

  const activeQuests = quests.filter((q) => !q.claimed).slice(0, 3);
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
          {activeQuests.length === 0 ? (
            <div className="font-bold text-emerald-300">
              🎉 Bạn đã hoàn thành xuất sắc mọi nhiệm vụ!
            </div>
          ) : (
            activeQuests.map((q) => {
              const ready = q.progress >= q.target;
              const pct = Math.min(100, (q.progress / q.target) * 100);
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-white/10 bg-slate-800/80 p-2"
                >
                  <div className="flex items-center justify-between font-extrabold">
                    <span className="text-amber-200">
                      {q.icon} {q.title}
                    </span>
                    <span
                      className={`text-[10px] ${ready ? 'text-lime-300' : 'text-slate-300'}`}
                    >
                      {q.progress}/{q.target}
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
                🍿 Ăn Bắp Rang Bơ (+30⚡)
              </button>
            </>
          ) : currentWorld === 'mall' ? (
            <>
              <div className="mb-1.5 text-xs font-black text-pink-300">
                🛍️ Trung Tâm Thương Mại
              </div>
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
          ) : (
            <>
              <div className="mb-1.5 text-xs font-black text-sky-300">
                {worldCfg.icon} {worldCfg.name}
              </div>
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
