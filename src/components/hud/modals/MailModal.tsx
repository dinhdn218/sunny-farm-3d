'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { FESTIVALS } from '@/config/festivals';
import { MAILBOX_ID, letterGiftLabel } from '@/lib/mail';
import { dayLabel } from '@/lib/clock';
import { ModalShell } from './ModalShell';

// The farm's letters: welcome, festival news and residents' thanks, some with a gift to claim
export function MailModal() {
  const mail = useGameStore((s) => s.mail);
  const hasMailbox = useGameStore(
    (s) => !!s.decorPlacements[MAILBOX_ID] && s.ownedCosmetics.includes(MAILBOX_ID)
  );
  const readLetter = useGameStore((s) => s.readLetter);
  const claimLetter = useGameStore((s) => s.claimLetter);
  // The first unread letter opens by itself
  const [openId, setOpenId] = useState(() => (mail.find((l) => !l.read) ?? mail[0])?.id ?? null);
  const open = mail.find((l) => l.id === openId);

  useEffect(() => {
    if (openId) readLetter(openId);
  }, [openId, readLetter]);

  return (
    <ModalShell
      icon="✉️"
      title="Hộp Thư"
      subtitle={
        hasMailbox
          ? 'Thư từ và quà của cư dân gửi tới nông trại'
          : 'Mẹo: đặt 📮 Hộp Thư Đồng Quê ra nông trại để nhận thư cảm ơn kèm quà sau mỗi lần giao đơn'
      }
      maxWidth="max-w-3xl"
    >
      {mail.length === 0 ? (
        <p className="py-6 text-center text-sm font-bold text-amber-800">📭 Chưa có thư nào.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
          <ul className="max-h-48 shrink-0 space-y-1.5 overflow-y-auto pr-1 md:max-h-none md:w-64">
            {mail.map((letter) => {
              const waitingGift = !!letter.gift && !letter.claimed;
              return (
                <li key={letter.id}>
                  <button
                    onClick={() => setOpenId(letter.id)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left ${
                      letter.id === openId
                        ? 'border-amber-600 bg-amber-200'
                        : 'border-amber-700/20 bg-white/80 hover:bg-amber-50'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${letter.read ? 'bg-transparent' : 'bg-red-500'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-xs text-amber-950 ${letter.read ? 'font-bold' : 'font-black'}`}
                      >
                        {letter.title}
                      </span>
                      <span className="block truncate text-[10px] font-bold text-amber-700">
                        {letter.from} • {dayLabel(letter.day)}
                      </span>
                    </span>
                    {waitingGift && <span className="shrink-0 text-base">🎁</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {open && (
            <article className="min-h-0 flex-1 overflow-y-auto rounded-2xl border-2 border-amber-700/30 bg-white/85 p-4">
              <div className="text-[11px] font-bold text-amber-700">
                Từ: {open.from} • {dayLabel(open.day)}
              </div>
              <h3 className="mt-0.5 text-lg font-black text-amber-950">{open.title}</h3>
              <p className="mt-2 text-sm font-bold leading-relaxed text-amber-900">{open.body}</p>
              {open.gift && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-600/30 bg-amber-100 px-3 py-2">
                  <span className="text-sm font-black text-amber-900">
                    🎁 {letterGiftLabel(open.gift, open.gift.festival ? FESTIVALS[open.gift.festival].token.icon : '')}
                  </span>
                  {open.claimed ? (
                    <span className="rounded-lg bg-slate-300 px-3 py-1.5 text-xs font-black text-slate-700">
                      ✓ Đã nhận
                    </span>
                  ) : (
                    <button
                      onClick={() => claimLetter(open.id)}
                      className="game-btn rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500"
                    >
                      🎁 Nhận Quà
                    </button>
                  )}
                </div>
              )}
            </article>
          )}
        </div>
      )}
    </ModalShell>
  );
}
