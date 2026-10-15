'use client';

import { Fragment, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { QuestCategory, QuestItem } from '@/types/game';
import { activeMainQuest, isClaimable, visibleQuests } from '@/lib/quests';
import { activeFestival, festivalDaysLeft } from '@/lib/festivals';
import { FESTIVALS } from '@/config/festivals';
import { localDateKey } from '@/lib/dailyGift';
import { ModalShell } from './ModalShell';

const TABS: { id: QuestCategory; label: string }[] = [
  { id: 'main', label: '📖 Cốt Truyện' },
  { id: 'daily', label: '📅 Hằng Ngày' },
  { id: 'achievement', label: '🏆 Thành Tựu' },
];

function QuestRow({ quest, locked = false }: { quest: QuestItem; locked?: boolean }) {
  const claimQuest = useGameStore((s) => s.claimQuest);
  const pct = Math.min(100, (quest.progress / quest.target) * 100);
  const canClaim = isClaimable(quest);
  const tiers = quest.tiers ?? 0;
  const tiersDone = quest.claimed ? tiers : quest.tier ?? 0;

  return (
    <div
      className={`flex flex-col items-start justify-between gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:items-center ${
        quest.claimed || locked
          ? 'border-amber-700/20 bg-amber-100/50 opacity-75'
          : 'border-amber-700/40 bg-amber-100/95'
      }`}
    >
      <div className="flex w-full flex-1 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-700 bg-amber-300 text-2xl">
          {locked ? '🔒' : quest.icon}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-amber-950">{quest.title}</span>
            {tiers > 0 && (
              <span className="text-sm text-amber-500">
                {'★'.repeat(tiersDone)}
                {'☆'.repeat(tiers - tiersDone)}
              </span>
            )}
            {!locked && (
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-900">
                {Math.min(quest.progress, quest.target).toLocaleString('vi-VN')}/
                {quest.target.toLocaleString('vi-VN')}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-bold text-amber-800">
            {locked ? 'Hoàn thành nhiệm vụ trước đó để mở khóa.' : quest.desc}
          </p>
          {!locked && (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-950/20">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col items-end gap-1.5 sm:w-auto">
        <div className="flex items-center gap-2 text-xs font-black text-amber-900">
          {quest.rewardGold > 0 && <span>🪙 +{quest.rewardGold}</span>}
          <span>💎 +{quest.rewardGems}</span>
          {!!quest.rewardTokens && quest.festival && (
            <span className={FESTIVALS[quest.festival].ui.text}>
              {FESTIVALS[quest.festival].token.icon} +{quest.rewardTokens}
            </span>
          )}
        </div>
        {quest.claimed ? (
          <span className="rounded-xl bg-slate-300 px-3 py-1.5 text-xs font-black text-slate-700">
            ✓ Đã Nhận
          </span>
        ) : canClaim ? (
          <button
            onClick={() => claimQuest(quest.id)}
            className="game-btn animate-bounce rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500"
          >
            🎁 Nhận Thưởng!
          </button>
        ) : (
          <span className="rounded-xl bg-amber-200/80 px-3 py-1.5 text-xs font-bold text-amber-900">
            {locked ? 'Chưa mở' : 'Đang thực hiện'}
          </span>
        )}
      </div>
    </div>
  );
}

export function QuestModal() {
  const allQuests = useGameStore((s) => s.quests);
  const day = useGameStore((s) => s.day);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const today = localDateKey(new Date());
  const festival = activeFestival(today);
  const quests = visibleQuests(allQuests, festival?.id ?? null);
  const tabs = festival ? [...TABS, { id: 'event' as const, label: `${festival.icon} Lễ Hội` }] : TABS;
  const [tab, setTab] = useState<QuestCategory>('main');

  const mains = quests.filter((q) => q.category === 'main');
  const active = activeMainQuest(quests);
  const activeIndex = active ? mains.indexOf(active) : mains.length;
  // Story so far, the current quest, then a peek at the next two (locked)
  const storyQuests = mains.slice(0, Math.min(mains.length, activeIndex + 3));
  const storyDone = mains.filter((q) => q.claimed).length;
  const dailies = quests.filter((q) => q.category === 'daily');
  const achievements = quests.filter((q) => q.category === 'achievement');
  const festivalQuests = quests.filter((q) => q.category === 'event');

  return (
    <ModalShell
      icon="📜"
      title="Bảng Nhiệm Vụ & Phần Thưởng"
      subtitle="Theo cốt truyện, làm nhiệm vụ hằng ngày và săn thành tựu để nhận Vàng 🪙 và Kim Cương 💎!"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const claimable = quests.filter((q) => q.category === t.id && isClaimable(q)).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`game-btn relative rounded-xl px-3.5 py-1.5 text-xs font-black sm:text-sm ${
                tab === t.id ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
              }`}
            >
              {t.label}
              {claimable > 0 && (
                <span className="absolute -right-1.5 -top-1.5 rounded-full border border-white bg-red-600 px-1.5 text-[10px] font-black text-white">
                  {claimable}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 overflow-y-auto pr-1">
        {tab === 'main' && (
          <>
            <div className="rounded-2xl border-2 border-amber-700/30 bg-amber-50/80 p-3">
              <div className="flex justify-between text-xs font-black text-amber-900">
                <span>📖 Tiến độ cốt truyện</span>
                <span>
                  {storyDone}/{mains.length} nhiệm vụ
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-amber-950/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-lime-500"
                  style={{ width: `${(storyDone / mains.length) * 100}%` }}
                />
              </div>
            </div>
            {storyQuests.map((q, i) => (
              <Fragment key={q.id}>
                {(i === 0 || q.chapter !== storyQuests[i - 1].chapter) && (
                  <div className="pt-1 text-xs font-black uppercase tracking-wide text-amber-800">
                    {q.chapter}
                  </div>
                )}
                <QuestRow quest={q} locked={i > activeIndex} />
              </Fragment>
            ))}
            {!active && (
              <p className="text-center text-sm font-black text-emerald-700">
                🎉 Bạn đã hoàn thành toàn bộ cốt truyện!
              </p>
            )}
          </>
        )}

        {tab === 'daily' && (
          <>
            <div className="rounded-2xl border-2 border-sky-700/30 bg-sky-50/80 p-3 text-xs font-bold text-sky-900">
              🔄 Nhiệm vụ hằng ngày của Ngày {day}: đổi mới mỗi khi bạn Qua Ngày.
            </div>
            {dailies.map((q) => (
              <QuestRow key={q.id} quest={q} />
            ))}
          </>
        )}

        {tab === 'achievement' &&
          achievements.map((q) => <QuestRow key={q.id} quest={q} />)}

        {tab === 'event' && festival && (
          <>
            <div
              className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 p-3 text-xs font-bold ${festival.ui.panel}`}
            >
              <span>
                {festival.icon} {festival.name} còn {festivalDaysLeft(festival, today)} ngày • đổi{' '}
                {festival.token.icon} {festival.token.name} lấy quà ở {festival.shop.name} (Công Viên)
              </span>
              <button
                onClick={() => setActiveModal('festivalShop')}
                className={`rounded-lg px-2.5 py-1 text-xs font-black text-white ${festival.ui.button}`}
              >
                {festival.shop.icon} Xem Quầy
              </button>
            </div>
            {festivalQuests.map((q) => (
              <QuestRow key={q.id} quest={q} />
            ))}
          </>
        )}
      </div>
    </ModalShell>
  );
}
