'use client';

import { useGameStore } from '@/store/useGameStore';
import { touchMove } from '@/lib/controls';

function setTouchMove(x: number, z: number, active: boolean) {
  if (active) {
    touchMove.x = x;
    touchMove.z = z;
  } else {
    if (touchMove.x === x) touchMove.x = 0;
    if (touchMove.z === z) touchMove.z = 0;
  }
}

function PadButton({ x, z, icon }: { x: number; z: number; icon: string }) {
  return (
    <button
      onTouchStart={() => setTouchMove(x, z, true)}
      onTouchEnd={() => setTouchMove(x, z, false)}
      onMouseDown={() => setTouchMove(x, z, true)}
      onMouseUp={() => setTouchMove(x, z, false)}
      className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-amber-400 bg-amber-900/80 text-white"
    >
      <i className={`fa-solid ${icon}`} />
    </button>
  );
}

// On-screen D-pad for phones (hidden from md up), as in the HTML version
export function MobileDpad() {
  const interactFront = useGameStore((s) => s.interactFront);

  return (
    <div className="pointer-events-auto fixed bottom-28 left-3 z-20 flex flex-col items-center gap-1 opacity-85 md:hidden">
      <PadButton x={0} z={-1} icon="fa-chevron-up" />
      <div className="flex gap-1">
        <PadButton x={-1} z={0} icon="fa-chevron-left" />
        <button
          onClick={interactFront}
          className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-emerald-600 text-[10px] font-black text-white"
        >
          LÀM
        </button>
        <PadButton x={1} z={0} icon="fa-chevron-right" />
      </div>
      <PadButton x={0} z={1} icon="fa-chevron-down" />
    </div>
  );
}
