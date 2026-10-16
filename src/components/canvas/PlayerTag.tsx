'use client';

import { Html } from './Html';

// Overhead name pill + speech bubble, fixed pixel size like the HTML version's DOM tags
export function PlayerTag({
  name,
  chatText,
  isSelf = false,
  level,
  hearts,
}: {
  name: string;
  chatText?: string;
  isSelf?: boolean;
  // Farmer level (players only)
  level?: number;
  // Friendship hearts (residents only)
  hearts?: number;
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
          {level !== undefined && (
            <span className="mr-1 rounded-full bg-orange-600 px-1.5 text-[9px] text-white">Lv{level}</span>
          )}
          {name}
          {!!hearts && <span className="ml-1 text-[10px] text-pink-300">❤️{hearts}</span>}
        </div>
      </div>
    </Html>
  );
}
