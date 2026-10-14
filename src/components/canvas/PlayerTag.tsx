'use client';

import { Html } from '@react-three/drei';

// Overhead name pill + speech bubble, fixed pixel size like the HTML version's DOM tags
export function PlayerTag({
  name,
  chatText,
  isSelf = false,
}: {
  name: string;
  chatText?: string;
  isSelf?: boolean;
}) {
  return (
    <Html position={[0, 2.15, 0]} zIndexRange={[15, 0]}>
      <div className="player-tag flex w-max flex-col items-center">
        {chatText && (
          <div className="mb-1 max-w-[200px] whitespace-normal rounded-2xl border-2 border-amber-400 bg-white px-3 py-1 text-center text-xs font-extrabold text-slate-900 shadow-lg">
            {chatText}
          </div>
        )}
        <div
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-black shadow ${
            isSelf
              ? 'border border-white bg-amber-400 text-amber-950'
              : 'border border-white/30 bg-slate-900/85 text-white'
          }`}
        >
          {name}
        </div>
      </div>
    </Html>
  );
}
