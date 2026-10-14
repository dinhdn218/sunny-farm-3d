'use client';

import { useGameStore } from '@/store/useGameStore';
import { CATCH_LIST, RARITY_LABEL } from '@/config/fish';
import { FishId, TimePhaseId } from '@/types/game';
import { ModalShell } from './ModalShell';

const PHASE_NAMES: Record<TimePhaseId, string> = {
  morning: 'Sáng',
  noon: 'Trưa',
  sunset: 'Hoàng hôn',
  night: 'Đêm',
};

const SPECIES = CATCH_LIST.filter((c) => c.id !== 'treasure');

// Every kind of catch: what has been caught (count and record size) and hints for the rest
export function FishJournalModal() {
  const fishLog = useGameStore((s) => s.fishLog);
  const found = SPECIES.filter((c) => fishLog[c.id as FishId]).length;

  return (
    <ModalShell
      icon="📖"
      title="Sổ Tay Câu Cá"
      subtitle={`Đã câu được ${found}/${SPECIES.length} loài • Đổi giờ trong ngày (nút 🌤️) để gặp loài khác`}
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
                  {RARITY_LABEL[c.rarity]} • Xuất hiện: {when}
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
