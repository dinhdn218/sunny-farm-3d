'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/useGameStore';
import { NPC_PRESETS } from '@/config/npcs';
import { ResidentId } from '@/types/game';
import { FarmListing, FarmView, farmSummary, residentFarm } from '@/lib/visit';
import { fetchFarm, fetchFarmList, isSupabaseConfigured } from '@/lib/supabase';
import { levelInfo } from '@/lib/leveling';
import { ModalShell } from './ModalShell';

// The farm is its own WebGL canvas, browser only
const FarmDiorama = dynamic(() => import('@/components/canvas/FarmDiorama'), { ssr: false });

type Source = 'village' | 'online';

// Look round a neighbour's farm: the residents' (always there) or other players' (with the cloud)
export function VisitModal() {
  const playerId = useGameStore((s) => s.playerId);
  const [source, setSource] = useState<Source>('village');
  const [online, setOnline] = useState<FarmListing[] | null>(null);
  const [onlineFailed, setOnlineFailed] = useState(false);
  const [selected, setSelected] = useState<string>(NPC_PRESETS[0].id);
  const [farm, setFarm] = useState<FarmView | null>(() => residentFarm(NPC_PRESETS[0].id));
  const [loading, setLoading] = useState(false);

  const village = useMemo<FarmListing[]>(
    () =>
      NPC_PRESETS.map((npc) => {
        const f = residentFarm(npc.id);
        return { id: npc.id, name: npc.name, level: levelInfo(f.xp).level, day: f.day };
      }),
    []
  );

  useEffect(() => {
    if (source !== 'online' || online || onlineFailed) return;
    fetchFarmList(playerId)
      .then(setOnline)
      .catch(() => setOnlineFailed(true));
  }, [source, online, onlineFailed, playerId]);

  const visit = (id: string) => {
    setSelected(id);
    if (source === 'village') {
      setFarm(residentFarm(id as ResidentId));
      return;
    }
    setLoading(true);
    setFarm(null);
    fetchFarm(id)
      .then(setFarm)
      .catch(() => setFarm(null))
      .finally(() => setLoading(false));
  };

  const list = source === 'village' ? village : online ?? [];
  const summary = farm && farmSummary(farm);

  return (
    <ModalShell
      icon="🏡"
      title="Thăm Hàng Xóm"
      subtitle="Ngắm nông trại của cư dân và người chơi khác • kéo để xoay, cuộn để phóng to"
      maxWidth="max-w-4xl"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setSource('village')}
          className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black ${
            source === 'village' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
          }`}
        >
          🏘️ Cư Dân
        </button>
        <button
          onClick={() => setSource('online')}
          disabled={!isSupabaseConfigured}
          title={isSupabaseConfigured ? undefined : 'Cần kết nối Cloud'}
          className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black ${
            source === 'online' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          🌐 Người Chơi
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        <ul className="max-h-40 shrink-0 space-y-1.5 overflow-y-auto pr-1 md:max-h-none md:w-56">
          {source === 'online' && !online && !onlineFailed && (
            <li className="text-xs font-bold text-amber-800">⏳ Đang tìm nông trại...</li>
          )}
          {source === 'online' && onlineFailed && (
            <li className="text-xs font-bold text-red-700">Không tải được danh sách, thử lại sau.</li>
          )}
          {source === 'online' && online?.length === 0 && (
            <li className="text-xs font-bold text-amber-800">Chưa có nông trại nào khác.</li>
          )}
          {list.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => visit(entry.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left ${
                  entry.id === selected
                    ? 'border-amber-600 bg-amber-200'
                    : 'border-amber-700/20 bg-white/80 hover:bg-amber-50'
                }`}
              >
                <span className="block truncate text-xs font-black text-amber-950">{entry.name}</span>
                <span className="block text-[10px] font-bold text-amber-700">
                  Cấp {entry.level} • Ngày {entry.day}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="h-64 overflow-hidden rounded-2xl border-2 border-amber-700/30 bg-gradient-to-b from-sky-300 to-sky-100 md:h-96">
            {farm ? (
              <FarmDiorama key={selected} farm={farm} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-bold text-sky-900">
                {loading ? '⏳ Đang bay tới nông trại...' : 'Chọn một nông trại để ghé thăm'}
              </div>
            )}
          </div>
          {farm && summary && (
            <div className="flex flex-wrap gap-1.5 text-[11px] font-black text-amber-900">
              <span className="rounded-full bg-amber-200 px-2 py-0.5">👩‍🌾 {farm.playerName}</span>
              <span className="rounded-full bg-amber-200 px-2 py-0.5">⭐ Cấp {summary.level}</span>
              <span className="rounded-full bg-amber-200 px-2 py-0.5">📅 Ngày {farm.day}</span>
              <span className="rounded-full bg-amber-200 px-2 py-0.5">🌱 {summary.planted} ô đang trồng</span>
              <span className="rounded-full bg-amber-200 px-2 py-0.5">🐄 {summary.animals} vật nuôi</span>
              <span className="rounded-full bg-amber-200 px-2 py-0.5">🏡 {summary.decor} đồ trang trí</span>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
