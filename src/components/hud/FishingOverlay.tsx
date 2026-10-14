'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { CATCHES, FISHING_ENERGY, RARITY_LABEL, TREASURE_REWARD } from '@/config/fish';
import { ITEMS } from '@/config/items';
import { REEL_START, ReelState, reelStep, zoneWidth } from '@/lib/fishing';
import { CatchId, FishingSession } from '@/types/game';

function Panel({ children, onPointerDown }: { children: ReactNode; onPointerDown?: () => void }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-30 flex justify-center px-3">
      <div
        onPointerDown={onPointerDown}
        className="glass-panel pointer-events-auto w-full max-w-md rounded-2xl p-4 text-center text-white"
      >
        {children}
      </div>
    </div>
  );
}

// Keep the fish inside the green zone: hold (mouse, touch or Space) to push the zone right
function ReelGame({ catchId }: { catchId: CatchId }) {
  const landCatch = useGameStore((s) => s.landCatch);
  const loseFish = useGameStore((s) => s.loseFish);
  const { difficulty, icon } = CATCHES[catchId];
  const reel = useRef<ReelState>({ ...REEL_START });
  const holding = useRef(false);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      reel.current = reelStep(reel.current, dt, holding.current, difficulty);
      if (reel.current.progress >= 1) return landCatch();
      if (reel.current.progress <= 0) return loseFish();
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      holding.current = e.type === 'keydown';
    };
    const release = () => {
      holding.current = false;
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('pointerup', release);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('pointerup', release);
    };
  }, [difficulty, landCatch, loseFish]);

  const { barPos, fishPos, progress } = reel.current;
  const hold = () => {
    holding.current = true;
  };

  return (
    <Panel>
      <div className="mb-2 text-sm font-black text-sky-200">🎣 Đang kéo cá! Giữ cá trong vùng xanh</div>
      <div
        onPointerDown={hold}
        className="relative h-10 w-full touch-none overflow-hidden rounded-xl border-2 border-sky-300/50 bg-sky-950"
      >
        <div
          className="absolute top-0 h-full rounded-lg border-2 border-emerald-200 bg-emerald-400/60"
          style={{ left: `${barPos * 100}%`, width: `${zoneWidth(difficulty) * 100}%` }}
        />
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
          style={{ left: `${fishPos * 100}%` }}
        >
          {icon}
        </div>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
        <div
          className={`h-full rounded-full ${progress > 0.25 ? 'bg-gradient-to-r from-lime-400 to-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-left text-[11px] font-bold text-slate-300">
          Giữ chuột / SPACE để kéo vùng xanh sang phải, thả ra để nó trôi về trái
        </span>
        <button
          onPointerDown={hold}
          className="game-btn shrink-0 touch-none rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"
        >
          Giữ Để Kéo
        </button>
      </div>
    </Panel>
  );
}

function ResultCard({ session }: { session: FishingSession }) {
  const startFishing = useGameStore((s) => s.startFishing);
  const endFishing = useGameStore((s) => s.endFishing);
  const setActiveModal = useGameStore((s) => s.setActiveModal);
  const cfg = CATCHES[session.catchId];

  return (
    <Panel>
      {session.escaped ? (
        <div className="text-base font-black text-slate-200">💨 Cá đã sổng mất!</div>
      ) : session.catchId === 'treasure' ? (
        <div className="text-base font-black text-yellow-300">
          🎁 Rương Kho Báu! +{TREASURE_REWARD.gold}🪙 +{TREASURE_REWARD.gems}💎
        </div>
      ) : (
        <div>
          <div className="text-4xl">{cfg.icon}</div>
          <div className="text-base font-black text-sky-200">
            {cfg.name} • {session.size} cm
          </div>
          <div className="text-xs font-bold text-slate-300">
            {RARITY_LABEL[cfg.rarity]} • Bán 🪙{ITEMS[session.catchId].sellPrice} • đã vào Giỏ Đồ
          </div>
          {session.firstOfKind && (
            <div className="mt-1 text-xs font-black text-amber-300">🆕 Loài mới được ghi vào Sổ Tay!</div>
          )}
        </div>
      )}
      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={startFishing}
          className="game-btn rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-500"
        >
          🎣 Câu Tiếp (-{FISHING_ENERGY}⚡)
        </button>
        <button
          onClick={() => setActiveModal('fishJournal')}
          className="game-btn rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white hover:bg-amber-500"
        >
          📖 Sổ Tay
        </button>
        <button
          onClick={endFishing}
          className="game-btn rounded-xl bg-slate-600 px-3 py-2 text-xs font-black text-white hover:bg-slate-500"
        >
          Thu Cần
        </button>
      </div>
    </Panel>
  );
}

// Fishing at the Beach jetty: wait for a bite, strike in time, then reel the catch in
export function FishingOverlay() {
  const fishing = useGameStore((s) => s.fishing);
  const fishBite = useGameStore((s) => s.fishBite);
  const hookFish = useGameStore((s) => s.hookFish);
  const loseFish = useGameStore((s) => s.loseFish);
  const endFishing = useGameStore((s) => s.endFishing);

  // The bite comes after the wait; a bite not struck in time lets go
  useEffect(() => {
    if (fishing?.stage !== 'waiting' && fishing?.stage !== 'bite') return;
    const stage = fishing.stage;
    const timer = setTimeout(
      () => (stage === 'waiting' ? fishBite() : loseFish()),
      Math.max(0, fishing.until - Date.now())
    );
    return () => clearTimeout(timer);
  }, [fishing, fishBite, loseFish]);

  // Space strikes while the float is down
  useEffect(() => {
    if (fishing?.stage !== 'bite') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      hookFish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fishing?.stage, hookFish]);

  if (!fishing) return null;

  if (fishing.stage === 'waiting') {
    return (
      <Panel>
        <div className="text-sm font-black text-sky-200">🎣 Đang chờ cá cắn câu...</div>
        <div className="mt-1 text-[11px] font-bold text-slate-300">
          Khi phao chìm xuống, bấm SPACE hoặc chạm thật nhanh để giật cần
        </div>
        <button
          onClick={endFishing}
          className="game-btn mt-2 rounded-xl bg-slate-600 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-500"
        >
          Thu Cần (Esc)
        </button>
      </Panel>
    );
  }

  if (fishing.stage === 'bite') {
    return (
      <Panel onPointerDown={hookFish}>
        <div className="animate-bounce text-2xl font-black text-amber-300">❗ Cá cắn câu!</div>
        <div className="text-sm font-black text-white">Bấm SPACE hoặc chạm vào đây để giật cần!</div>
      </Panel>
    );
  }

  if (fishing.stage === 'reeling') return <ReelGame catchId={fishing.catchId} />;
  return <ResultCard session={fishing} />;
}
