'use client';

import { useGameStore } from '@/store/useGameStore';
import { CATCH_LIST, RARITY_LABEL, WATER_NAMES } from '@/config/fish';
import { SEASONS, SEASON_ORDER } from '@/config/seasons';
import { seasonOf } from '@/lib/seasons';
import { CatchConfig, FishId, TimePhaseId } from '@/types/game';
import { ModalShell } from './ModalShell';

const PHASE_NAMES: Record<TimePhaseId, string> = {
  morning: 'Sáng',
  noon: 'Trưa',
  sunset: 'Hoàng hôn',
  night: 'Đêm',
};

const SPECIES = CATCH_LIST.filter((c) => c.id !== 'treasure');

// "Quanh năm", or the seasons it bites in through the year, e.g. "🌸 Xuân, 🍂 Thu"
const seasonsLabel = (c: CatchConfig) =>
  c.seasons.length === 4
    ? 'Quanh năm'
    : SEASON_ORDER.filter((id) => c.seasons.includes(id))
        .map((id) => `${SEASONS[id].icon} ${SEASONS[id].name.replace('Mùa ', '')}`)
        .join(', ');

// Every kind of catch: what has been caught (count and record size) and hints for the rest
export function FishJournalModal() {
  const fishLog = useGameStore((s) => s.fishLog);
  const season = useGameStore((s) => seasonOf(s.day));
  const found = SPECIES.filter((c) => fishLog[c.id as FishId]).length;

  return (
    <ModalShell
      icon="📖"
      title="Sổ Tay Câu Cá"
      subtitle={`Đã câu được ${found}/${SPECIES.length} loài • Biển ở Bãi Biển, Hồ Sen ở Công Viên • mỗi mùa, mỗi giờ (nút 🌤️) có loài riêng • Đang là ${SEASONS[season].icon} ${SEASONS[season].name}`}
    >
      <div className="grid grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
        {SPECIES.map((c) => {
          const log = fishLog[c.id as FishId];
          const when = c.phases.length ? c.phases.map((p) => PHASE_NAMES[p]).join(', ') : 'Mọi lúc';
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                log ? 'border-sky-600/40 bg-sky-50' : 'border-amber-700/20 bg-amber-100/60'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-700/30 bg-white/80 text-2xl">
                {log ? c.icon : '❓'}
              </div>
              <div>
                <div className="text-sm font-black text-amber-950">{log ? c.name : '???'}</div>
                <div className="text-[11px] font-bold text-amber-700">
                  {RARITY_LABEL[c.rarity]} • {c.waters.map((w) => WATER_NAMES[w]).join(' & ')} • {when}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold text-amber-700">
                  <span>{seasonsLabel(c)}</span>
                  {c.seasons.includes(season) ? (
                    <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-black text-white">Đang có mùa này</span>
                  ) : (
                    <span className="rounded-full bg-slate-400 px-1.5 text-[10px] font-black text-white">Hết mùa</span>
                  )}
                </div>
                {log && (
                  <div className="text-[11px] font-black text-sky-800">
                    Đã câu: {log.caught} • Kỷ lục: {log.best} cm
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}
