'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { WORLDS } from '@/config/worlds';
import { npcPresetsFor } from '@/config/npcs';
import { isSupabaseConfigured, signInWithGoogleOAuth } from '@/lib/supabase';
import { ModalShell } from './ModalShell';

// Profile & online lobby (the HTML version's online modal) plus Google cloud save
export function AuthModal() {
  const playerId = useGameStore((s) => s.playerId);
  const playerName = useGameStore((s) => s.playerName);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const remotePlayers = useGameStore((s) => s.remotePlayers);
  const userProfile = useGameStore((s) => s.userProfile);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const setWorld = useGameStore((s) => s.setWorld);
  const loginWithGoogleProfile = useGameStore((s) => s.loginWithGoogleProfile);
  const logoutGoogleProfile = useGameStore((s) => s.logoutGoogleProfile);
  const syncToCloud = useGameStore((s) => s.syncToCloud);

  const [nameInput, setNameInput] = useState(playerName);
  const [loading, setLoading] = useState(false);
  const zone = WORLDS[currentWorld];

  const loginQuickMode = () =>
    loginWithGoogleProfile({
      id: 'google_' + Math.random().toString(36).slice(2, 9),
      email: 'farmer@gmail.com',
      name: nameInput.trim() || playerName,
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      provider: 'google',
      lastSyncedAt: Date.now(),
    });

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        await signInWithGoogleOAuth();
      } else {
        loginQuickMode();
      }
    } catch {
      loginQuickMode();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      icon="🌐"
      title="Hồ Sơ & Sảnh Người Chơi Online"
      subtitle="Đổi tên nhân vật và xem danh sách cư dân đang trực tuyến"
      maxWidth="max-w-xl"
    >
      <div className="mb-4 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3.5">
        <div className="mb-1 text-xs font-extrabold text-amber-900">
          Tên hiển thị của bạn trên đầu nhân vật:
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            maxLength={20}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="flex-1 rounded-xl border-2 border-amber-600 bg-white px-3 py-1.5 text-sm font-black text-amber-950"
          />
          <button
            onClick={() => setPlayerName(nameInput)}
            className="game-btn rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
          >
            Lưu Tên
          </button>
        </div>
        <div className="mt-2 break-all text-[11px] font-bold text-amber-800">
          Mã định danh (User ID):{' '}
          <span className="rounded bg-amber-200/80 px-1.5 py-0.5 font-mono text-amber-950">
            {playerId}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-amber-700/20 pt-2.5">
          {userProfile ? (
            <>
              <div className="text-[11px] font-bold text-emerald-800">
                ☁️ Google: {userProfile.email}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={syncToCloud}
                  className="game-btn rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-500"
                >
                  Đồng Bộ Cloud
                </button>
                <button
                  onClick={logoutGoogleProfile}
                  className="game-btn rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-500"
                >
                  Đăng Xuất
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-bold text-amber-800">
                Đăng nhập Google để lưu Nông trại lên Cloud
              </div>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="game-btn flex items-center gap-1.5 rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-900 hover:bg-slate-100"
              >
                <i className="fa-brands fa-google" />
                {loading ? 'Đang kết nối...' : 'Đăng Nhập Google'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-2 text-xs font-black uppercase text-amber-900">
        👥 Cư Dân Đang Online Trong Thế Giới
      </div>
      <div className="space-y-2 overflow-y-auto pr-1">
        <div className="flex items-center justify-between rounded-xl border border-amber-700/40 bg-amber-200/80 p-2.5">
          <div>
            <div className="text-sm font-black text-amber-950">⭐ {playerName} (Bạn)</div>
            <div className="break-all font-mono text-[10px] text-amber-800">ID: {playerId}</div>
          </div>
          <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
            {zone.icon} {zone.name}
          </span>
        </div>

        {Object.values(remotePlayers).map((p) => {
          const peerZone = WORLDS[p.world] ?? WORLDS.farm;
          return (
            <div
              key={p.uid}
              className="flex items-center justify-between rounded-xl border border-amber-700/20 bg-white/80 p-2.5"
            >
              <div>
                <div className="text-sm font-black text-amber-950">🟢 {p.name}</div>
                <div className="break-all font-mono text-[10px] text-slate-600">ID: {p.uid}</div>
              </div>
              <button
                onClick={() => setWorld(peerZone.id)}
                className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-black text-white"
              >
                {peerZone.icon} Ghé thăm
              </button>
            </div>
          );
        })}

        {npcPresetsFor(currentWorld).map((npc, idx) => (
          <div
            key={`${npc.name}-${idx}`}
            className="flex items-center justify-between rounded-xl border border-amber-700/20 bg-white/80 p-2.5"
          >
            <div>
              <div className="text-sm font-black text-amber-950">🟢 {npc.name}</div>
              <div className="font-mono text-[10px] text-slate-500">
                ID: npc-friend-{idx + 101}
              </div>
            </div>
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
              {zone.icon} Cùng khu vực
            </span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
