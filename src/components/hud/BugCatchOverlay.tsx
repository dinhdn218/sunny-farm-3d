'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { BugCatch } from '@/types/game';
import { BUGS, BUG_NET_ENERGY } from '@/config/bugs';
import { netMarker, netZoneWidth } from '@/lib/bugs';
import { Panel } from './FishingOverlay';

// Swing when the marker sweeping the bar is inside the green zone (Space, the button or a tap)
function NetGame({ bugCatch }: { bugCatch: BugCatch }) {
  const swingNet = useGameStore((s) => s.swingNet);
  const endBugCatch = useGameStore((s) => s.endBugCatch);
  const cfg = BUGS[bugCatch.bug];
  const width = netZoneWidth(cfg.difficulty);
  const marker = useRef(0);
  const [, setFrame] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      marker.current = netMarker((now - start) / 1000, cfg.difficulty);
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      swingNet(marker.current);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }, [cfg.difficulty, swingNet]);

  return (
    <Panel>
      <div className="text-sm font-black text-lime-200">
        {cfg.icon} {cfg.name} <span className="text-amber-300">{'★'.repeat(Math.max(1, Math.ceil(cfg.difficulty / 2)))}</span>
      </div>
      <div className="mt-1 text-[11px] font-bold text-slate-300">
        Vung vợt khi vạch vàng nằm trong vùng xanh (-{BUG_NET_ENERGY}⚡)
      </div>
      <div className="relative mx-1 mt-3 h-6 rounded-full bg-slate-800">
        <div
          className="absolute inset-y-0 rounded-full bg-emerald-500/85"
          style={{ left: `${(bugCatch.zone - width / 2) * 100}%`, width: `${width * 100}%` }}
        />
        <div
          className="absolute -inset-y-1 w-1.5 rounded bg-yellow-300 shadow"
          style={{ left: `calc(${marker.current * 100}% - 3px)` }}
        />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <button
          onClick={() => swingNet(marker.current)}
          className="game-btn rounded-xl bg-lime-600 px-5 py-2 text-sm font-black text-white hover:bg-lime-500"
        >
          🥅 Vung Vợt! (Space)
        </button>
        <button
          onClick={endBugCatch}
          className="rounded-xl bg-slate-600 px-3 py-2 text-xs font-black text-white hover:bg-slate-500"
        >
          Thôi
        </button>
      </div>
    </Panel>
  );
}

function NetResult({ bugCatch }: { bugCatch: BugCatch }) {
  const endBugCatch = useGameStore((s) => s.endBugCatch);
  const cfg = BUGS[bugCatch.bug];

  // The card clears itself after a moment
  useEffect(() => {
    const timer = setTimeout(endBugCatch, 2200);
    return () => clearTimeout(timer);
  }, [endBugCatch]);

  return (
    <Panel>
      <div className="text-3xl">{bugCatch.caught ? cfg.icon : '💨'}</div>
      <div className={`mt-1 text-sm font-black ${bugCatch.caught ? 'text-lime-300' : 'text-slate-200'}`}>
        {bugCatch.caught
          ? `Bắt được ${cfg.name}! (bán 🪙${cfg.sellPrice})`
          : `${cfg.name} bay mất rồi! Lần sau nhắm kỹ hơn nhé.`}
      </div>
      <button
        onClick={endBugCatch}
        className="mt-3 rounded-xl bg-slate-600 px-4 py-1.5 text-xs font-black text-white hover:bg-slate-500"
      >
        Đóng
      </button>
    </Panel>
  );
}

// The net game over the Park while a bug is being caught
export function BugCatchOverlay() {
  const bugCatch = useGameStore((s) => s.bugCatch);
  if (!bugCatch) return null;
  return bugCatch.stage === 'aim' ? (
    <NetGame key={bugCatch.spot} bugCatch={bugCatch} />
  ) : (
    <NetResult bugCatch={bugCatch} />
  );
}
