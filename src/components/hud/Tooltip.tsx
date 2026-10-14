'use client';

import { useGameStore } from '@/store/useGameStore';

// Hover card that follows the cursor over tiles and clickable props
export function Tooltip() {
  const tooltip = useGameStore((s) => s.tooltip);
  if (!tooltip) return null;

  return (
    <div
      className="pointer-events-none fixed z-30 rounded-xl border-2 border-amber-400/80 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm"
      style={{ left: tooltip.x + 16, top: tooltip.y + 16 }}
    >
      <div className="text-sm text-amber-300">{tooltip.title}</div>
      <div className="text-slate-200">{tooltip.desc}</div>
    </div>
  );
}
