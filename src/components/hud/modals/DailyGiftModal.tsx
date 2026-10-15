'use client';

import { useGameStore } from '@/store/useGameStore';
import { DAILY_GIFTS, giftDay, giftLabel, localDateKey } from '@/lib/dailyGift';
import { levelInfo, levelReward, levelTitle } from '@/lib/leveling';
import { ModalShell } from './ModalShell';

const GIFT_ICONS = ['🪙', '🥖', '🪙', '🌾', '💎', '🎃', '💎'];

// Farmer level progress plus the 7-day login gift calendar
export function DailyGiftModal() {
  const xp = useGameStore((s) => s.xp);
  const loginStreak = useGameStore((s) => s.loginStreak);
  const lastGiftDate = useGameStore((s) => s.lastGiftDate);
  const claimDailyGift = useGameStore((s) => s.claimDailyGift);

  const todayGift = giftDay(lastGiftDate, loginStreak, localDateKey(new Date()));
  // Highlighted day of the round: today's gift, or the one already claimed today
  const currentDay = todayGift ?? loginStreak;
  const { level, into, need } = levelInfo(xp);
  const next = levelReward(level + 1);

  return (
    <ModalShell
      icon="🎁"
      title="Cấp Độ & Quà Hằng Ngày"
      subtitle="Mỗi ngày ghé nông trại nhận một món quà; đủ 7 ngày liên tiếp được 20💎"
    >
      <div className="overflow-y-auto pr-1">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-amber-700 bg-amber-400 text-amber-950 shadow-inner">
            <span className="text-[9px] font-black leading-none">CẤP</span>
            <span className="text-xl font-black leading-none">{level}</span>
          </div>
          <div className="flex-1">
            <div className="text-base font-black text-amber-950">⭐ {levelTitle(level)}</div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-amber-950/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: need ? `${(into / need) * 100}%` : '100%' }}
              />
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-amber-800">
              {need
                ? `${into}/${need} XP • Lên cấp ${level + 1}: +${next.gold}🪙 +${next.gems}💎`
                : 'Đã đạt cấp tối đa!'}
            </div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAILY_GIFTS.map((gift, i) => {
            const day = i + 1;
            const claimed = day < currentDay || (todayGift === null && day === currentDay);
            const isToday = todayGift === day;
            return (
              <div
                key={day}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-2 text-center ${
                  isToday
                    ? 'border-amber-500 bg-yellow-100 shadow-md'
                    : claimed
                    ? 'border-emerald-600/40 bg-emerald-50'
                    : 'border-amber-700/20 bg-amber-50/70 opacity-75'
                }`}
              >
                <div className="text-[10px] font-black uppercase text-amber-800">Ngày {day}</div>
                <div className="text-2xl">{claimed ? '✅' : GIFT_ICONS[i]}</div>
                <div className="text-[10px] font-bold leading-tight text-amber-900">{giftLabel(gift)}</div>
              </div>
            );
          })}
        </div>

        {todayGift !== null ? (
          <button
            onClick={claimDailyGift}
            className="game-btn w-full animate-bounce rounded-2xl border-2 border-emerald-900 bg-emerald-600 py-3 text-base font-black text-white hover:bg-emerald-500"
          >
            🎁 Nhận Quà Ngày {todayGift}
          </button>
        ) : (
          <p className="text-center text-sm font-black text-emerald-700">
            ✅ Đã nhận quà hôm nay. Mai quay lại để nhận quà ngày {(loginStreak % 7) + 1}!
          </p>
        )}
        <p className="mt-2 text-center text-[11px] font-bold text-amber-700">
          Bỏ lỡ một ngày thì chuỗi quà bắt đầu lại từ ngày 1.
        </p>
      </div>
    </ModalShell>
  );
}
