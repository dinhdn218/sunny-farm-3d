'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/useGameStore';
import { NPC_PRESETS } from '@/config/npcs';
import { ResidentId, VisitKind } from '@/types/game';
import { FarmListing, FarmView, farmSummary, residentFarm } from '@/lib/visit';
import {
  fetchFarm,
  fetchFarmList,
  fetchVisitsToday,
  isSupabaseConfigured,
  sendFarmVisit,
} from '@/lib/supabase';
import { FARM_LIKE_POINTS, NEIGHBOR_WATER_TILES } from '@/lib/neighbors';
import { levelInfo } from '@/lib/leveling';
import { ModalShell } from './ModalShell';

// The farm is its own WebGL canvas, browser only
const FarmDiorama = dynamic(() => import('@/components/canvas/FarmDiorama'), { ssr: false });

type Source = 'village' | 'online';

const ACTION_BUTTON = 'game-btn rounded-xl px-3 py-1.5 text-xs font-black text-white disabled:bg-slate-400';

// A like for a resident's farm (a little friendship), or a watering and a like for another player's
// (they find a letter from you with a small gift); each once a day per farm
function NeighborActions({ source, farmId, farmName }: { source: Source; farmId: string; farmName: string }) {
  const userId = useGameStore((s) => s.userProfile?.id ?? null);
  const playerName = useGameStore((s) => s.playerName);
  const likedResident = useGameStore(
    (s) => s.residentDay === s.day && s.likedFarms.includes(farmId as ResidentId)
  );
  const likeResidentFarm = useGameStore((s) => s.likeResidentFarm);
  const helpedNeighbor = useGameStore((s) => s.helpedNeighbor);
  // What was done on this farm today: unknown until the cloud answers
  const [done, setDone] = useState<VisitKind[] | null>(null);
  const [sending, setSending] = useState<VisitKind | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (source !== 'online' || !userId) return;
    let live = true;
    fetchVisitsToday(farmId, userId)
      .then((kinds) => live && setDone(kinds))
      .catch(() => live && setDone([]));
    return () => {
      live = false;
    };
  }, [source, farmId, userId]);

  if (source === 'village') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => likeResidentFarm(farmId as ResidentId)}
          disabled={likedResident}
          className={`${ACTION_BUTTON} bg-pink-600 hover:bg-pink-500`}
        >
          {likedResident ? '❤️ Đã thả tim hôm nay' : '❤️ Thả Tim'}
        </button>
        <span className="text-[11px] font-bold text-amber-800">
          +{FARM_LIKE_POINTS} tình bạn với {farmName}, mỗi ngày một lần
        </span>
      </div>
    );
  }

  if (!userId) {
    return (
      <p className="text-[11px] font-bold text-amber-800">
        🔑 Đăng nhập Google (nút 👥 trên cùng) để tưới giúp và thả tim cho nông trại người chơi khác.
      </p>
    );
  }

  const act = async (kind: VisitKind) => {
    setSending(kind);
    setFailed(false);
    try {
      const result = await sendFarmVisit(farmId, kind, playerName);
      setDone((kinds) => [...(kinds ?? []), kind]);
      if (result === 'sent') helpedNeighbor(kind, farmName);
    } catch {
      setFailed(true);
    } finally {
      setSending(null);
    }
  };

  const button = (kind: VisitKind, label: string, doneLabel: string, color: string) => {
    const isDone = done?.includes(kind);
    return (
      <button
        onClick={() => act(kind)}
        disabled={!done || isDone || !!sending}
        className={`${ACTION_BUTTON} ${color}`}
      >
        {isDone ? doneLabel : sending === kind ? 'Đang gửi...' : label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {button('water', '💧 Tưới Giúp', '💧 Đã tưới hôm nay', 'bg-sky-600 hover:bg-sky-500')}
      {button('like', '❤️ Thả Tim', '❤️ Đã thả tim hôm nay', 'bg-pink-600 hover:bg-pink-500')}
      <span className="text-[11px] font-bold text-amber-800">
        {failed
          ? '⚠️ Không gửi được, thử lại sau.'
          : `Tưới giúp ${NEIGHBOR_WATER_TILES} ô đang khô • chủ nhà nhận thư kèm quà • mỗi ngày một lần`}
      </span>
    </div>
  );
}

// Look round a neighbour's farm: the residents' (always there) or other players' (with the cloud)
export function VisitModal() {
  const playerId = useGameStore((s) => s.playerId);
  const [source, setSource] = useState<Source>('village');
  const [online, setOnline] = useState<FarmListing[] | null>(null);
  const [onlineFailed, setOnlineFailed] = useState(false);
  const [selected, setSelected] = useState<string>(NPC_PRESETS[0].id);
  const [farm, setFarm] = useState<FarmView | null>(() => residentFarm(NPC_PRESETS[0].id));
  // Where the farm on show comes from (the tabs can change while it is still up)
  const [farmSource, setFarmSource] = useState<Source>('village');
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
    setFarmSource(source);
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
          {farm && (
            <NeighborActions
              key={`${farmSource}:${selected}`}
              source={farmSource}
              farmId={selected}
              farmName={farm.playerName}
            />
          )}
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
