'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { saveFromCloud } from '@/lib/saveData';

function FarmCard({
  icon,
  title,
  note,
  day,
  gold,
  gems,
  plots,
  onKeep,
}: {
  icon: string;
  title: string;
  note: string;
  day: number;
  gold: number;
  gems: number;
  plots: number;
  onKeep: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-3 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-4 text-left">
      <div>
        <div className="text-base font-black text-amber-950">
          {icon} {title}
        </div>
        <div className="mb-2 text-[11px] font-bold text-amber-700">{note}</div>
        <div className="space-y-1 text-sm font-bold text-amber-950">
          <div>📅 Ngày {day}</div>
          <div>🪙 {gold.toLocaleString('vi-VN')} Vàng</div>
          <div>💎 {gems.toLocaleString('vi-VN')} Kim Cương</div>
          <div>🗺️ {plots} lô đất</div>
        </div>
      </div>
      <button
        onClick={onKeep}
        className="game-btn w-full rounded-xl bg-emerald-600 py-2 text-xs font-black text-white hover:bg-emerald-500"
      >
        Giữ Bản Này
      </button>
    </div>
  );
}

// Shown when signing in finds a different farm both here and in the cloud: the player keeps one
export function CloudConflictModal() {
  const conflict = useGameStore((s) => s.cloudConflict);
  const day = useGameStore((s) => s.day);
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const plots = useGameStore((s) => s.ownedPlots.length);
  const resolveCloudConflict = useGameStore((s) => s.resolveCloudConflict);
  const logoutCloud = useGameStore((s) => s.logoutCloud);

  const cloudFarm = useMemo(
    () => (conflict ? saveFromCloud(conflict.cloud.data, conflict.cloud.version) : null),
    [conflict]
  );
  if (!conflict || !cloudFarm) return null;

  const savedAt = new Date(conflict.cloud.savedAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="parchment-panel relative w-full max-w-xl rounded-3xl p-6 text-center">
        <h2 className="text-xl font-black text-amber-950">☁️ Chọn Nông Trại Để Chơi Tiếp</h2>
        <p className="mb-4 mt-1 text-xs font-bold text-amber-800">
          Tài khoản {conflict.profile.email} đã có một nông trại trên Cloud, khác với nông trại trên
          máy này. Bản không chọn sẽ bị ghi đè và không lấy lại được.
        </p>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <FarmCard
            icon="💻"
            title="Trên máy này"
            note="Đang chơi trên thiết bị này"
            day={day}
            gold={gold}
            gems={gems}
            plots={plots}
            onKeep={() => resolveCloudConflict('local')}
          />
          <FarmCard
            icon="☁️"
            title="Trên Cloud"
            note={`Lưu lúc ${savedAt}`}
            day={cloudFarm.day}
            gold={cloudFarm.gold}
            gems={cloudFarm.gems}
            plots={cloudFarm.ownedPlots.length}
            onKeep={() => resolveCloudConflict('cloud')}
          />
        </div>

        <button
          onClick={logoutCloud}
          className="text-xs font-bold text-amber-800 underline hover:text-amber-950"
        >
          Để sau (đăng xuất, giữ nguyên nông trại trên máy này)
        </button>
      </div>
    </div>
  );
}
