'use client';

import { useGameStore } from '@/store/useGameStore';
import { QuestCategory } from '@/types/game';
import { activeMainQuest, isClaimable, visibleQuests } from '@/lib/quests';
import { activeFestival } from '@/lib/festivals';
import { FESTIVALS } from '@/config/festivals';
import { localDateKey } from '@/lib/dailyGift';
import { ZonePanel } from './ZonePanel';

const CATEGORY_TAG: Record<QuestCategory, string> = {
  main: '📖',
  daily: '📅',
  achievement: '🏆',
  event: '🎪',
};

export function QuestTracker() {
  const allQuests = useGameStore((s) => s.quests);
  const festival = activeFestival(localDateKey(new Date()));
  const quests = visibleQuests(allQuests, festival?.id ?? null);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const claimQuest = useGameStore((s) => s.claimQuest);
  const setActiveModal = useGameStore((s) => s.setActiveModal);

  // Rewards waiting first, then the current story quest, then today's dailies
  const mainQuest = activeMainQuest(quests);
  const shownQuests = [
    ...quests.filter(isClaimable),
    ...(mainQuest ? [mainQuest] : []),
    ...quests.filter((q) => q.category === 'daily' && !q.claimed),
  ]
    .filter((q, i, list) => list.findIndex((other) => other.id === q.id) === i)
    .slice(0, 3);

  return (
    <aside
      className="pointer-events-none fixed left-3 z-20 flex max-w-[260px] flex-col gap-2"
      style={{ top: 'calc(var(--hud-top, 80px) + 4px)' }}
    >
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
            shownQuests.map((q, i) => {
              const ready = isClaimable(q);
              const pct = Math.min(100, (q.progress / q.target) * 100);
              return (
                // Phones show only the first quest, keeping the zone panel clear of the D-pad
                <div
                  key={q.id}
                  className={`rounded-xl border border-white/10 bg-slate-800/80 p-2 ${i > 0 ? 'hidden sm:block' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1 font-extrabold">
                    <span className="truncate text-amber-200">
                      <span className="mr-1 text-[10px]">
                        {q.festival ? FESTIVALS[q.festival].icon : CATEGORY_TAG[q.category]}
                      </span>
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
      {currentWorld !== 'farm' && <ZonePanel />}
    </aside>
  );
}
