'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { WHEEL_COLORS, WHEEL_PRIZES } from '@/config/luckyWheel';
import { todayKey } from '@/lib/clock';
import { soundFX } from '@/lib/audio';
import { ModalShell } from './ModalShell';

const SLICE = 360 / WHEEL_PRIZES.length;
const SPIN_MS = 4200;

// The casino's free daily spin: the wheel eases out onto the prize the store picked
export function LuckyWheelModal() {
  const spinLuckyWheel = useGameStore((s) => s.spinLuckyWheel);
  const spunToday = useGameStore((s) => s.lastWheelDate === todayKey());
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);

  useEffect(() => {
    if (!spinning) return;
    // Clicks slowing down with the wheel
    const ticks = Array.from({ length: 14 }, (_, i) => setTimeout(() => soundFX.spin(), (i * i * SPIN_MS) / 230));
    return () => ticks.forEach(clearTimeout);
  }, [spinning]);

  const spin = () => {
    const index = spinLuckyWheel();
    if (index === null) return;
    const wobble = (Math.random() - 0.5) * SLICE * 0.6;
    // Five turns, then the chosen slice under the pointer at the top
    setAngle((a) => a - (a % 360) + 360 * 5 + (360 - (index * SLICE + SLICE / 2)) + wobble);
    setSpinning(true);
    setWon(null);
    setTimeout(() => {
      setSpinning(false);
      setWon(index);
      soundFX.questClaim();
    }, SPIN_MS);
  };

  const gradient = WHEEL_COLORS.map((c, i) => `${c} ${i * SLICE}deg ${(i + 1) * SLICE}deg`).join(', ');
  const prize = won !== null ? WHEEL_PRIZES[won] : null;

  return (
    <ModalShell icon="🎡" title="Vòng Quay May Mắn" subtitle="Mỗi ngày 1 lượt quay miễn phí • Độc đắc 1000🪙 + 10💎" maxWidth="max-w-lg">
      <div className="flex flex-col items-center gap-4 overflow-y-auto">
        <div className="relative h-72 w-72 max-w-full">
          {/* Pointer */}
          <div className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2 border-x-[14px] border-t-[24px] border-x-transparent border-t-red-600 drop-shadow" />
          <div
            className="relative h-full w-full rounded-full border-[6px] border-amber-400 shadow-[0_6px_0_#92400e,0_14px_24px_rgba(0,0,0,0.35)]"
            style={{
              background: `conic-gradient(${gradient})`,
              transform: `rotate(${angle}deg)`,
              transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.7, 0.12, 1)` : 'none',
            }}
          >
            {WHEEL_PRIZES.map((p, i) => (
              <div
                key={i}
                className="absolute inset-0 flex justify-center pt-4"
                style={{ transform: `rotate(${i * SLICE + SLICE / 2}deg)` }}
              >
                <span className="text-2xl drop-shadow">{p.icon}</span>
              </div>
            ))}
            <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-amber-200 bg-amber-400 shadow-inner" />
          </div>
        </div>

        {prize ? (
          <div className="card-in rounded-2xl border-2 border-amber-600/40 bg-amber-100 px-5 py-2 text-center">
            <div className="text-xs font-bold text-amber-800">🎉 Chúc mừng! Bạn quay trúng</div>
            <div className="text-lg font-black text-amber-950">
              {prize.icon} {prize.label}
            </div>
          </div>
        ) : (
          <div className="min-h-[3.25rem] text-center text-xs font-bold text-amber-800">
            {spinning ? 'Đang quay…' : spunToday ? 'Hôm nay bạn đã quay rồi • Quay lại vào ngày mai nhé!' : 'Bấm QUAY để thử vận may hôm nay!'}
          </div>
        )}

        <button
          onClick={spin}
          disabled={spinning || spunToday}
          className="game-btn w-full rounded-2xl border-2 border-pink-900 bg-pink-600 py-3 text-base font-black text-white hover:bg-pink-500 disabled:opacity-50"
        >
          🎡 QUAY {spunToday && !spinning ? '(đã dùng lượt hôm nay)' : 'MIỄN PHÍ'}
        </button>

        <div className="grid w-full grid-cols-2 gap-1.5 text-[11px] font-bold text-amber-900">
          {WHEEL_PRIZES.map((p) => (
            <div key={p.label} className="flex items-center gap-1.5 rounded-lg bg-amber-100/80 px-2 py-1">
              <span>{p.icon}</span>
              <span className="truncate">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
