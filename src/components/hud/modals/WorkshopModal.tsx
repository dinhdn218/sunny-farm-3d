'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/useGameStore';
import { MACHINES, MACHINE_LIST, RECIPES } from '@/config/machines';
import { ITEMS } from '@/config/items';
import { ItemId, MachineId, RecipeConfig } from '@/types/game';
import { formatCountdown } from '@/lib/format';
import { ModalShell } from './ModalShell';

// The 3D turntable is its own WebGL canvas, browser only
const ItemPreview = dynamic(() => import('../ItemPreview'), { ssr: false });

const outputLabel = (recipe: RecipeConfig) =>
  recipe.output.id === 'bread'
    ? { icon: '🥖', name: 'Bánh Mì', note: '+45⚡ mỗi ổ (phím 5)' }
    : {
        icon: ITEMS[recipe.output.id].icon,
        name: ITEMS[recipe.output.id].name,
        note: `Bán 🪙${ITEMS[recipe.output.id].sellPrice}`,
      };

const durationLabel = (seconds: number) =>
  seconds < 60 ? `${seconds} giây` : `${Math.round(seconds / 60)} phút`;

// `blocked` says why the machine cannot take a batch right now (not bought, not placed, busy)
function RecipeRow({ recipe, blocked }: { recipe: RecipeConfig; blocked: string | null }) {
  const items = useGameStore((s) => s.items);
  const startRecipe = useGameStore((s) => s.startRecipe);
  const inputs = Object.entries(recipe.inputs) as [ItemId, number][];
  const ready = inputs.every(([id, n]) => (items[id] ?? 0) >= n);
  const out = outputLabel(recipe);
  const disabled = !!blocked || !ready;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-700/25 bg-white/80 p-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-black text-amber-950">
        {inputs.map(([id, n]) => {
          const have = items[id] ?? 0;
          return (
            <span
              key={id}
              className={`rounded-lg px-1.5 py-0.5 ${have >= n ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}
            >
              {ITEMS[id].icon} {ITEMS[id].name} {have}/{n}
            </span>
          );
        })}
        <span className="text-amber-700">➔</span>
        <span>
          {out.icon} {recipe.output.count > 1 ? `${recipe.output.count} ` : ''}
          {out.name}
        </span>
        <span className="text-[10px] font-bold text-amber-700">
          ({out.note} • {durationLabel(recipe.seconds)})
        </span>
      </div>
      <button
        onClick={() => startRecipe(recipe.id)}
        disabled={disabled}
        className={`game-btn shrink-0 rounded-xl px-3 py-1.5 text-xs font-black text-white ${
          disabled ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
      >
        {blocked ?? (ready ? 'Bắt Đầu' : 'Thiếu nguyên liệu')}
      </button>
    </div>
  );
}

function MachineDetail({ id }: { id: MachineId }) {
  const cfg = MACHINES[id];
  const gold = useGameStore((s) => s.gold);
  const machine = useGameStore((s) => s.machines[id]);
  const placed = useGameStore((s) => !!s.decorPlacements[id]);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const buyMachine = useGameStore((s) => s.buyMachine);
  const collectMachine = useGameStore((s) => s.collectMachine);
  const startPlacingDecor = useGameStore((s) => s.startPlacingDecor);
  const [now, setNow] = useState(() => Date.now());

  const job = machine?.job ?? null;
  useEffect(() => {
    if (!job) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [job]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
      <div className="flex gap-3 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-amber-700/30 bg-gradient-to-b from-sky-200 to-amber-100">
          <ItemPreview decorId={id} />
        </div>
        <div className="flex flex-1 flex-col justify-between gap-2">
          <div>
            <div className="text-base font-black text-amber-950">
              {cfg.icon} {cfg.name}
            </div>
            <p className="text-xs font-bold text-amber-800">{cfg.description}</p>
          </div>
          {!machine ? (
            <button
              onClick={() => buyMachine(id)}
              disabled={gold < cfg.price}
              className={`game-btn self-start rounded-xl px-4 py-2 text-xs font-black text-white ${
                gold >= cfg.price ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-400'
              }`}
            >
              {gold >= cfg.price ? `Mua Máy (🪙 ${cfg.price})` : `Cần 🪙 ${cfg.price} Vàng`}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => startPlacingDecor(id)}
                className={`game-btn rounded-xl px-3 py-1.5 text-xs font-black text-white ${
                  placed ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {placed ? 'Di Chuyển Máy' : 'Đặt Ra Nông Trại'}
              </button>
              {!placed && currentWorld !== 'farm' && (
                <span className="text-[11px] font-bold text-amber-800">Về Nông Trại để đặt máy.</span>
              )}
            </div>
          )}
        </div>
      </div>

      {machine && job && (
        <JobStatus
          readyAt={job.readyAt}
          recipe={RECIPES[job.recipeId]}
          now={now}
          onCollect={() => collectMachine(id)}
        />
      )}

      {machine && !placed && (
        <div className="rounded-xl border-2 border-amber-600/40 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          🏡 Đặt máy ra nông trại để bắt đầu chế biến.
        </div>
      )}

      <div className="text-xs font-black uppercase text-amber-900">📋 Công Thức</div>
      <div className="space-y-2">
        {cfg.recipes.map((recipeId) => (
          <RecipeRow
            key={recipeId}
            recipe={RECIPES[recipeId]}
            blocked={!machine ? 'Chưa có máy' : !placed ? 'Chưa đặt máy' : job ? 'Máy đang bận' : null}
          />
        ))}
      </div>
    </div>
  );
}

function JobStatus({
  readyAt,
  recipe,
  now,
  onCollect,
}: {
  readyAt: number;
  recipe: RecipeConfig;
  now: number;
  onCollect: () => void;
}) {
  const out = outputLabel(recipe);
  const left = readyAt - now;
  const pct = Math.min(100, Math.max(0, 100 - (left / (recipe.seconds * 1000)) * 100));

  return (
    <div className="rounded-2xl border-2 border-emerald-700/30 bg-emerald-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-emerald-900">
          {out.icon} Đang làm: {recipe.output.count > 1 ? `${recipe.output.count} ` : ''}
          {out.name}
        </span>
        {left > 0 ? (
          <span className="text-xs font-black text-emerald-800">⏳ {formatCountdown(left)}</span>
        ) : (
          <button
            onClick={onCollect}
            className="game-btn animate-bounce rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-black text-amber-950"
          >
            ✨ Thu Hàng
          </button>
        )}
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-950/15">
        <div className="h-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {left > 0 && (
        <p className="mt-1 text-[11px] font-bold text-emerald-800">Ngủ qua đêm thì mẻ hàng xong ngay.</p>
      )}
    </div>
  );
}

// Workshop: buy and place processing machines, then turn farm goods into pricier artisan goods
export function WorkshopModal() {
  const gold = useGameStore((s) => s.gold);
  const machines = useGameStore((s) => s.machines);
  const workshopMachine = useGameStore((s) => s.workshopMachine);
  const openWorkshop = useGameStore((s) => s.openWorkshop);
  const selected = workshopMachine ?? MACHINE_LIST[0].id;

  return (
    <ModalShell
      icon="🏭"
      title="Xưởng Chế Biến"
      subtitle="Biến nông sản và sản phẩm chăn nuôi thành hàng thủ công giá cao"
      maxWidth="max-w-4xl"
      headerRight={
        <div className="rounded-xl bg-amber-900 px-3 py-1.5 text-sm font-black text-yellow-300">
          🪙 {gold} Vàng
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <div className="flex shrink-0 gap-2 overflow-x-auto md:w-52 md:flex-col md:overflow-visible">
          {MACHINE_LIST.map((m) => {
            const owned = machines[m.id];
            const job = owned?.job;
            return (
              <button
                key={m.id}
                onClick={() => openWorkshop(m.id)}
                className={`flex min-w-[150px] items-center gap-2 rounded-2xl border-2 p-2.5 text-left transition ${
                  selected === m.id
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-amber-700/40 bg-amber-100/90 hover:bg-amber-50'
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span>
                  <span className="block text-xs font-black text-amber-950">{m.name}</span>
                  <span className="block text-[10px] font-bold text-amber-700">
                    {!owned ? `🪙 ${m.price}` : job ? '⏳ Đang làm' : '✓ Sẵn sàng'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <MachineDetail key={selected} id={selected} />
      </div>
    </ModalShell>
  );
}
