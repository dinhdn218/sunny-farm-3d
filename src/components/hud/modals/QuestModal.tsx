'use client';

import { useGameStore } from '@/store/useGameStore';
import { ModalShell } from './ModalShell';

export function QuestModal() {
  const quests = useGameStore((s) => s.quests);
  const claimQuest = useGameStore((s) => s.claimQuest);

  return (
    <ModalShell
      icon="📜"
      title="Bảng Nhiệm Vụ & Phần Thưởng"
      subtitle="Hoàn thành nhiệm vụ mỗi ngày để nhận Vàng 🪙 và Kim Cương 💎 mua sắm trang phục!"
    >
      <div className="space-y-3 overflow-y-auto pr-1">
        {quests.map((q) => {
          const pct = Math.min(100, (q.progress / q.target) * 100);
          const canClaim = !q.claimed && q.progress >= q.target;

          return (
            <div
              key={q.id}
              className={`flex flex-col items-start justify-between gap-3 rounded-2xl border-2 p-4 sm:flex-row sm:items-center ${
                q.claimed
                  ? 'border-amber-700/20 bg-amber-100/50 opacity-75'
                  : 'border-amber-700/40 bg-amber-100/95'
              }`}
            >
              <div className="flex w-full flex-1 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-700 bg-amber-300 text-2xl">
                  {q.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-amber-950">{q.title}</span>
                    <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-900">
                      {q.progress}/{q.target}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-bold text-amber-800">{q.desc}</p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-950/20">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-col items-end gap-1.5 sm:w-auto">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                  <span>🪙 +{q.rewardGold}</span>
                  <span>💎 +{q.rewardGems}</span>
                </div>
                {q.claimed ? (
                  <span className="rounded-xl bg-slate-300 px-3 py-1.5 text-xs font-black text-slate-700">
                    ✓ Đã Nhận
                  </span>
                ) : canClaim ? (
                  <button
                    onClick={() => claimQuest(q.id)}
                    className="game-btn animate-bounce rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500"
                  >
                    🎁 Nhận Thưởng!
                  </button>
                ) : (
                  <span className="rounded-xl bg-amber-200/80 px-3 py-1.5 text-xs font-bold text-amber-900">
                    Đang thực hiện
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
