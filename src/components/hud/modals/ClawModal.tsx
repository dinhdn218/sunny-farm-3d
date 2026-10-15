'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { CLAW_GRIP, CLAW_PRICE, CLAW_PRIZES, CLAW_REACH, stockClaw } from '@/config/claw';
import { soundFX } from '@/lib/audio';
import { ModalShell } from './ModalShell';

// Toys sit evenly across the bottom of the machine
const TOY_X = [0.1, 0.3, 0.5, 0.7, 0.9];
const SWEEP_MS = 1700;

type Stage = 'idle' | 'aiming' | 'dropping' | 'won' | 'missed';

// Time the claw over a toy and press GẮP: it drops, and holds on most of the time
export function ClawModal() {
  const gold = useGameStore((s) => s.gold);
  const payClaw = useGameStore((s) => s.payClaw);
  const winClawPrize = useGameStore((s) => s.winClawPrize);
  const [toys, setToys] = useState(() => stockClaw());
  const [stage, setStage] = useState<Stage>('idle');
  const [clawX, setClawX] = useState(0.5);
  const [target, setTarget] = useState<number | null>(null);
  const started = useRef(0);

  // The claw sweeps from side to side while aiming
  useEffect(() => {
    if (stage !== 'aiming') return;
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - started.current) / SWEEP_MS;
      setClawX(0.5 - Math.cos(t * Math.PI) * 0.45);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  const play = () => {
    if (!payClaw()) return;
    if (stage === 'won' || stage === 'missed') setToys(stockClaw());
    setTarget(null);
    started.current = performance.now();
    setStage('aiming');
  };

  const grab = () => {
    if (stage !== 'aiming') return;
    const nearest = TOY_X.reduce((best, x, i) => (Math.abs(x - clawX) < Math.abs(TOY_X[best] - clawX) ? i : best), 0);
    const holds = Math.abs(TOY_X[nearest] - clawX) <= CLAW_REACH && Math.random() < CLAW_GRIP;
    setTarget(holds ? nearest : null);
    setStage('dropping');
    soundFX.cast();
    setTimeout(() => {
      if (holds) {
        winClawPrize(toys[nearest]);
        setStage('won');
      } else {
        soundFX.error();
        setStage('missed');
      }
    }, 1300);
  };

  // Space grabs too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      if (stage === 'aiming') grab();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const lowered = stage === 'dropping' || stage === 'won';
  const prize = target !== null ? CLAW_PRIZES[toys[target]] : null;

  return (
    <ModalShell
      icon="🕹️"
      title="Máy Gắp Thú"
      subtitle={`${CLAW_PRICE}🪙 một lượt • canh càng gắp trên món muốn lấy rồi bấm GẮP (Space)`}
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col items-center gap-3 overflow-y-auto">
        <div className="relative h-64 w-full overflow-hidden rounded-3xl border-[6px] border-pink-600 bg-gradient-to-b from-sky-100 to-sky-200 shadow-inner">
          {/* Rail and claw */}
          <div className="absolute inset-x-0 top-3 h-1.5 bg-slate-400" />
          <div
            className="absolute top-3 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${clawX * 100}%`, transition: stage === 'aiming' ? 'none' : 'left 0.2s' }}
          >
            <div
              className="w-1 bg-slate-500"
              style={{ height: lowered ? '9.5rem' : '2.5rem', transition: 'height 0.6s ease-in-out' }}
            />
            <div className="relative -mt-1 text-3xl leading-none">
              🪝
              {stage === 'won' && prize && <span className="absolute left-1/2 top-6 -translate-x-1/2 text-3xl">{prize.toy}</span>}
            </div>
          </div>
          {/* Toys */}
          <div className="absolute inset-x-0 bottom-3">
            {toys.map((toyIndex, i) =>
              stage === 'won' && i === target ? null : (
                <span
                  key={i}
                  className="absolute bottom-0 -translate-x-1/2 text-4xl drop-shadow"
                  style={{ left: `${TOY_X[i] * 100}%` }}
                  title={CLAW_PRIZES[toyIndex].label}
                >
                  {CLAW_PRIZES[toyIndex].toy}
                </span>
              )
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-3 bg-pink-300/70" />
        </div>

        <div className="min-h-[2.5rem] text-center">
          {stage === 'won' && prize && (
            <div className="card-in text-base font-black text-emerald-700">
              🎉 Gắp trúng {prize.toy} {prize.label}!
            </div>
          )}
          {stage === 'missed' && <div className="card-in text-base font-black text-red-600">😵 Hụt rồi! Thử lại nhé</div>}
          {stage === 'aiming' && <div className="text-sm font-black text-sky-700">Canh đúng lúc… bấm GẮP!</div>}
          {stage === 'idle' && (
            <div className="text-xs font-bold text-amber-800">Bạn có {gold}🪙 • mỗi món trong máy là một phần quà</div>
          )}
        </div>

        {stage === 'aiming' ? (
          <button
            onClick={grab}
            className="game-btn w-full rounded-2xl border-2 border-red-900 bg-red-600 py-3 text-lg font-black text-white hover:bg-red-500"
          >
            ⬇️ GẮP!
          </button>
        ) : (
          <button
            onClick={play}
            disabled={stage === 'dropping'}
            className="game-btn w-full rounded-2xl border-2 border-pink-900 bg-pink-600 py-3 text-base font-black text-white hover:bg-pink-500 disabled:opacity-50"
          >
            🪙 {stage === 'idle' ? 'Bỏ xu & chơi' : 'Chơi tiếp'} ({CLAW_PRICE}🪙)
          </button>
        )}

        <div className="grid w-full grid-cols-2 gap-1.5 text-[11px] font-bold text-amber-900">
          {CLAW_PRIZES.map((p) => (
            <div key={p.toy} className="flex items-center gap-1.5 rounded-lg bg-amber-100/80 px-2 py-1">
              <span className="text-base">{p.toy}</span>
              <span className="truncate">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
