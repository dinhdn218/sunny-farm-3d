'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { BauCuaBets, BauCuaFace } from '@/types/game';
import {
  BAU_CUA_CHIPS,
  BAU_CUA_FACES,
  BAU_CUA_MAX_BET,
  BAU_CUA_NAMES,
  BauCuaFaceConfig,
} from '@/config/baucua';
import { FESTIVALS } from '@/config/festivals';
import { bauCuaPayout, totalBet } from '@/lib/baucua';
import { activeFestival } from '@/lib/festivals';
import { todayKey } from '@/lib/clock';
import { soundFX } from '@/lib/audio';
import { ModalShell } from './ModalShell';

// How long the bowl rattles before it is lifted off the dice
const SHAKE_MS = 1600;

const FACE_BY_ID = Object.fromEntries(BAU_CUA_FACES.map((f) => [f.id, f])) as Record<BauCuaFace, BauCuaFaceConfig>;

// The gourd has no emoji: two green bulbs on a stalk
function BauGourd({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M16 2.5v3.5" stroke="#78350f" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="11" r="5.5" fill="#84cc16" />
      <circle cx="16" cy="21.5" r="8.8" fill="#65a30d" />
      <ellipse cx="12.4" cy="18.5" rx="2.2" ry="3.2" fill="#d9f99d" opacity="0.55" />
      <ellipse cx="14" cy="9" rx="1.4" ry="2" fill="#ecfccb" opacity="0.7" />
    </svg>
  );
}

function FaceIcon({ face, big }: { face: BauCuaFaceConfig; big?: boolean }) {
  return face.icon ? (
    <span className={`leading-none ${big ? 'text-4xl' : 'text-2xl'}`}>{face.icon}</span>
  ) : (
    <BauGourd className={big ? 'h-10 w-10' : 'h-7 w-7'} />
  );
}

// One of the dice on the plate
function Die({ face }: { face: BauCuaFace }) {
  return (
    <div className="card-in flex h-11 w-11 items-center justify-center rounded-lg border-2 border-slate-300 bg-white shadow-md">
      <FaceIcon face={FACE_BY_ID[face]} />
    </div>
  );
}

type Phase = 'bet' | 'shake' | 'result';

// Bầu Cua Tôm Cá at the casino while Tết runs: chips on the mat, the bowl rattled, the dice revealed
export function BauCuaModal() {
  const gold = useGameStore((s) => s.gold);
  const playBauCua = useGameStore((s) => s.playBauCua);
  const tet = activeFestival(todayKey())?.id === 'tet';
  const [chip, setChip] = useState(BAU_CUA_CHIPS[0]);
  const [bets, setBets] = useState<BauCuaBets>({});
  const [lastBets, setLastBets] = useState<BauCuaBets>({});
  const [phase, setPhase] = useState<Phase>('bet');
  const [dice, setDice] = useState<BauCuaFace[]>([]);
  // The round being played: what went on the mat, what came back, and the purse before it
  const [round, setRound] = useState<{ staked: number; won: number; goldBefore: number } | null>(null);

  const staked = totalBet(bets);
  const hint =
    staked > gold ? 'Không đủ Vàng cho số cược này' : staked + chip > BAU_CUA_MAX_BET ? `Tối đa ${BAU_CUA_MAX_BET}🪙 một ván` : null;

  useEffect(() => {
    if (phase !== 'shake') return;
    const ticks = Array.from({ length: 8 }, (_, i) => setTimeout(() => soundFX.spin(), i * 190));
    const lift = setTimeout(() => setPhase('result'), SHAKE_MS);
    return () => {
      ticks.forEach(clearTimeout);
      clearTimeout(lift);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'result' || !round) return;
    if (round.won > round.staked) soundFX.questClaim();
    else if (round.won > 0) soundFX.coin();
  }, [phase, round]);

  // A tap on a square puts the chosen chip on it; after a round, it starts the next one
  const place = (face: BauCuaFace) => {
    if (phase === 'shake') return;
    const current = phase === 'result' ? {} : bets;
    if (totalBet(current) + chip > BAU_CUA_MAX_BET) return;
    if (phase === 'result') {
      setPhase('bet');
      setDice([]);
      setRound(null);
    }
    soundFX.coin();
    setBets({ ...current, [face]: (current[face] ?? 0) + chip });
  };

  const shake = () => {
    const goldBefore = gold;
    const result = playBauCua(bets);
    if (!result) return;
    setRound({ staked, won: bauCuaPayout(bets, result), goldBefore });
    setLastBets(bets);
    setDice(result);
    setPhase('shake');
  };

  const newRound = (next: BauCuaBets) => {
    setBets(next);
    setDice([]);
    setRound(null);
    setPhase('bet');
  };

  // The purse stays as it was until the bowl comes off
  const shownGold = phase === 'shake' && round ? round.goldBefore : gold;
  const net = round ? round.won - round.staked : 0;

  return (
    <ModalShell
      icon="🎲"
      title="Bầu Cua Tôm Cá"
      subtitle={`Đặt cược rồi lắc: mỗi xúc xắc ra con mình chọn ăn thêm 1 lần tiền cược • Tối đa ${BAU_CUA_MAX_BET}🪙 một ván`}
      maxWidth="max-w-lg"
      headerRight={
        <div className="rounded-xl bg-amber-900 px-3 py-1.5 text-sm font-black tabular-nums text-yellow-300">
          🪙 {shownGold}
        </div>
      }
    >
      {!tet ? (
        <p className="rounded-2xl border-2 border-red-700/30 bg-red-50 p-4 text-center text-sm font-bold text-red-900">
          🧧 Bàn Bầu Cua chỉ mở dịp {FESTIVALS.tet.name} ({FESTIVALS.tet.start.split('-').reverse().join('/')} –{' '}
          {FESTIVALS.tet.end.split('-').reverse().join('/')}). Hẹn bạn ngày Tết nhé!
        </p>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {/* The plate, the dice and the bowl over them */}
          <div className="relative mx-auto h-32 w-64 max-w-full">
            <div className="absolute bottom-0 left-1/2 h-10 w-60 -translate-x-1/2 rounded-[50%] border-4 border-sky-200 bg-white shadow-md" />
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {phase === 'result' && dice.map((face, i) => <Die key={i} face={face} />)}
            </div>
            <div
              className={`absolute bottom-3 left-1/2 -translate-x-1/2 transition-all duration-500 ${
                phase === 'result' ? '-translate-y-24 opacity-0' : ''
              }`}
            >
              <div
                className={`h-24 w-44 rounded-t-full border-4 border-sky-300 bg-gradient-to-b from-white to-sky-100 shadow-lg ${
                  phase === 'shake' ? 'bowl-shake' : ''
                }`}
              >
                <div className="mx-auto mt-6 h-2 w-28 rounded-full bg-sky-300/70" />
              </div>
            </div>
          </div>

          <div className="min-h-[1.5rem] text-center text-sm font-black">
            {phase === 'shake' && <span className="text-amber-800">Đang lắc... 🎲</span>}
            {phase === 'result' && round && (
              <span className={net > 0 ? 'text-emerald-700' : net < 0 ? 'text-red-700' : 'text-amber-800'}>
                Ra {dice.map((d) => BAU_CUA_NAMES[d]).join(', ')} •{' '}
                {net > 0 ? `🎉 Thắng +${net}🪙` : net < 0 ? `Thua ${-net}🪙` : 'Hòa vốn'}
              </span>
            )}
          </div>

          {/* The mat */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl border-4 border-amber-400 bg-red-800 p-2">
            {BAU_CUA_FACES.map((face) => {
              const bet = bets[face.id] ?? 0;
              const hits = dice.filter((d) => d === face.id).length;
              const shown = phase === 'result';
              return (
                <button
                  key={face.id}
                  data-face={face.id}
                  onClick={() => place(face.id)}
                  disabled={phase === 'shake'}
                  aria-label={`${face.name}${bet ? `, đang cược ${bet} Vàng` : ''}${shown ? `, ra ${hits} con` : ''}`}
                  style={{ backgroundColor: face.color }}
                  className={`relative flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-amber-200/70 transition ${
                    shown && hits > 0 ? 'scale-105 ring-4 ring-yellow-300' : shown ? 'opacity-55' : 'hover:brightness-110 active:scale-95'
                  }`}
                >
                  <FaceIcon face={face} big />
                  <span className="text-xs font-black uppercase text-white drop-shadow">{face.name}</span>
                  {bet > 0 && (
                    <span className="absolute right-1 top-1 rounded-full border border-white bg-amber-300 px-1.5 text-[10px] font-black text-amber-950 shadow">
                      {bet}🪙
                    </span>
                  )}
                  {shown && hits > 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-white px-1.5 text-[10px] font-black text-emerald-700 shadow">
                      ×{hits}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chips, and what is on the mat */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {BAU_CUA_CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChip(c)}
                  aria-pressed={chip === c}
                  className={`h-11 w-11 rounded-full border-4 border-dashed text-xs font-black text-white shadow transition ${
                    chip === c ? 'border-white bg-red-600 ring-4 ring-amber-300' : 'border-red-200 bg-red-500/80 hover:bg-red-500'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="text-right text-xs font-black text-amber-900">
              Tổng cược: {staked}/{BAU_CUA_MAX_BET}🪙
              {hint && phase !== 'result' && <div className="text-[11px] font-bold text-red-600">{hint}</div>}
            </div>
          </div>

          <div className="flex gap-2">
            {phase === 'result' ? (
              <>
                <button
                  onClick={() => newRound(lastBets)}
                  className="game-btn flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-black text-white hover:bg-red-500"
                >
                  ↺ Cược lại ({totalBet(lastBets)}🪙)
                </button>
                <button
                  onClick={() => newRound({})}
                  className="game-btn rounded-xl bg-slate-600 px-3 py-2.5 text-sm font-black text-white hover:bg-slate-500"
                >
                  Ván mới
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setBets({})}
                  disabled={phase === 'shake' || staked === 0}
                  className="game-btn rounded-xl bg-slate-600 px-3 py-2.5 text-sm font-black text-white hover:bg-slate-500 disabled:opacity-50"
                >
                  Xóa cược
                </button>
                <button
                  onClick={shake}
                  disabled={phase === 'shake' || staked === 0 || staked > gold}
                  className="game-btn flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:bg-slate-400"
                >
                  {phase === 'shake' ? 'Đang lắc...' : `🎲 Lắc! (${staked}🪙)`}
                </button>
              </>
            )}
          </div>
          <p className="text-center text-[11px] font-bold text-amber-800">
            Ra 1 con: ăn 1 lần • 2 con: ăn 2 lần • 3 con: ăn 3 lần • Không ra: mất tiền cược
          </p>
        </div>
      )}
    </ModalShell>
  );
}
