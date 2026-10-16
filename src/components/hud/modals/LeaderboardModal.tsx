'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { levelInfo } from '@/lib/leveling';
import {
  BOARD_CATEGORIES,
  BoardCategory,
  BoardEntry,
  villageBoard,
  weekDaysLeft,
  weekKey,
} from '@/lib/leaderboard';
import { fetchLeaderboard, isSupabaseConfigured } from '@/lib/supabase';
import { ModalShell } from './ModalShell';

const MEDALS = ['🥇', '🥈', '🥉'];

// This week's top farmers online (or, without the cloud, the player against the residents)
export function LeaderboardModal() {
  const playerId = useGameStore((s) => s.playerId);
  const playerName = useGameStore((s) => s.playerName);
  const weekly = useGameStore((s) => s.weekly);
  const xp = useGameStore((s) => s.xp);
  const [category, setCategory] = useState<BoardCategory>('gold');
  const [online, setOnline] = useState<BoardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  const now = new Date();
  const week = weekKey(now);
  const cfg = BOARD_CATEGORIES.find((c) => c.id === category) ?? BOARD_CATEGORIES[0];
  const yourScore =
    category === 'level' ? levelInfo(xp).level : weekly.week === week ? weekly[category] ?? 0 : 0;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let live = true;
    setOnline(null);
    setFailed(false);
    fetchLeaderboard(category, week)
      .then((entries) => live && setOnline(entries))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [category, week]);

  const village = !isSupabaseConfigured || failed;
  const entries = village
    ? villageBoard(category, week, { name: playerName, score: yourScore })
    : (online ?? []).map((e) => (e.id === playerId ? { ...e, you: true } : e));
  const youListed = entries.some((e) => e.you);

  return (
    <ModalShell
      icon="🏆"
      title="Bảng Xếp Hạng"
      subtitle={
        category === 'level'
          ? 'Cấp độ nông dân cao nhất'
          : `Tuần ${week.split('-W')[1]} • còn ${weekDaysLeft(now)} ngày, sang tuần mới tính lại từ đầu`
      }
      maxWidth="max-w-lg"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {BOARD_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black ${
              category === c.id ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
            }`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {village && (
        <p className="mb-2 rounded-xl border border-amber-700/20 bg-amber-50/80 px-3 py-1.5 text-[11px] font-bold text-amber-800">
          🏘️ Bảng Làng: bạn so tài với các cư dân. Đăng nhập Cloud để đua cùng người chơi khác.
        </p>
      )}

      <div className="space-y-1.5 overflow-y-auto pr-1">
        {!village && online === null && (
          <p className="py-4 text-center text-sm font-bold text-amber-800">⏳ Đang tải bảng xếp hạng...</p>
        )}
        {!village && online?.length === 0 && (
          <p className="py-4 text-center text-sm font-bold text-amber-800">Chưa ai ghi điểm tuần này. Bạn là người đầu tiên!</p>
        )}
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
              entry.you ? 'border-amber-500 bg-amber-200' : 'border-amber-700/20 bg-white/80'
            }`}
          >
            <span className="w-7 text-center text-base font-black text-amber-900">{MEDALS[i] ?? i + 1}</span>
            <span className="flex-1 truncate text-sm font-black text-amber-950">
              {entry.name}
              {entry.you && <span className="ml-1.5 rounded-full bg-amber-600 px-1.5 text-[10px] text-white">Bạn</span>}
            </span>
            <span className="text-sm font-black tabular-nums text-amber-900">
              {category === 'level' ? `Lv ${entry.score}` : `${cfg.icon} ${entry.score.toLocaleString('vi-VN')}`}
            </span>
          </div>
        ))}
        {!village && online && !youListed && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-amber-600 px-3 py-2 text-sm font-black text-amber-900">
            <span className="flex-1">Bạn (chưa vào top 20)</span>
            <span>{category === 'level' ? `Lv ${yourScore}` : `${cfg.icon} ${yourScore}`}</span>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
