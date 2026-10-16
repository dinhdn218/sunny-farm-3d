'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { ItemId, ResidentId } from '@/types/game';
import { RESIDENTS } from '@/config/npcs';
import { ITEMS, ITEM_LIST } from '@/config/items';
import { GiftReaction, HEART_POINTS, MAX_FRIENDSHIP, giftReaction, hearts } from '@/lib/friendship';
import { ModalShell } from './ModalShell';

const REACTION_ICON: Record<GiftReaction, string> = { love: '😍', like: '😊', neutral: '🙂', hate: '😣' };

function ResidentCard({ id }: { id: ResidentId }) {
  const resident = RESIDENTS[id];
  const points = useGameStore((s) => s.friendship[id] ?? 0);
  const day = useGameStore((s) => s.day);
  const residentDay = useGameStore((s) => s.residentDay);
  const talkedTo = useGameStore((s) => s.talkedTo);
  const giftedTo = useGameStore((s) => s.giftedTo);
  const items = useGameStore((s) => s.items);
  const given = useGameStore((s) => s.giftLog[id]);
  const talkTo = useGameStore((s) => s.talkTo);
  const giveGift = useGameStore((s) => s.giveGift);
  const [choice, setChoice] = useState<ItemId | null>(null);

  const talked = residentDay === day && talkedTo.includes(id);
  const gifted = residentDay === day && giftedTo.includes(id);
  const h = hearts(points);
  const next = HEART_POINTS[h] ?? MAX_FRIENDSHIP;
  const prev = h > 0 ? HEART_POINTS[h - 1] : 0;
  const bag = ITEM_LIST.filter((item) => (items[item.id] ?? 0) > 0);
  // What they made of the gifts so far, so their tastes come to light
  const known = (given ?? []).map((item) => ({ item, reaction: giftReaction(resident, item) }));

  return (
    <ModalShell
      icon={resident.name.split(' ').pop() ?? '🙂'}
      title={resident.name}
      subtitle={`${'❤️'.repeat(h)}${'🤍'.repeat(5 - h)} • Thân thiết ${points}/${MAX_FRIENDSHIP}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-3 overflow-y-auto pr-1">
        <div className="rounded-2xl border-2 border-amber-600/40 bg-white/90 px-4 py-3 text-sm font-bold text-amber-950">
          💬 “{talked ? resident.talk[h] : resident.phrases[day % resident.phrases.length]}”
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-black text-amber-800">
            <span>{h < 5 ? `Tim tiếp theo: ${next} điểm` : 'Bạn thân nhất!'}</span>
            <span>
              Trò chuyện +2 • Giao đơn của {resident.name.split(' ')[0]} +3 • Quà tùy món
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-amber-950/20">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-rose-500"
              style={{ width: `${h >= 5 ? 100 : ((points - prev) / (next - prev)) * 100}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => talkTo(id)}
          disabled={talked}
          className={`game-btn w-full rounded-xl py-2 text-sm font-black text-white ${
            talked ? 'cursor-not-allowed bg-slate-400' : 'bg-sky-600 hover:bg-sky-500'
          }`}
        >
          {talked ? '✓ Hôm nay đã trò chuyện' : '💬 Trò Chuyện (+2)'}
        </button>

        <div className="rounded-2xl border-2 border-pink-600/30 bg-pink-50/90 p-3">
          <div className="mb-2 text-xs font-black text-pink-900">
            🎁 Tặng quà (mỗi ngày 1 món){gifted && ' • Hôm nay đã tặng rồi'}
          </div>
          {bag.length === 0 ? (
            <p className="text-xs font-bold text-pink-800">Giỏ đồ đang trống.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {bag.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setChoice(item.id)}
                  disabled={gifted}
                  title={item.name}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl border-2 text-xl ${
                    choice === item.id ? 'border-pink-500 bg-pink-200' : 'border-pink-200 bg-white'
                  } ${gifted ? 'opacity-50' : 'hover:bg-pink-100'}`}
                >
                  {item.icon}
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-800 px-1 text-[9px] font-black leading-4 text-white">
                    {items[item.id]}
                  </span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => choice && giveGift(id, choice)}
            disabled={gifted || !choice || !items[choice]}
            className={`game-btn mt-2 w-full rounded-xl py-1.5 text-xs font-black text-white ${
              gifted || !choice || !items[choice] ? 'cursor-not-allowed bg-slate-400' : 'bg-pink-600 hover:bg-pink-500'
            }`}
          >
            {choice && items[choice] ? `Tặng ${ITEMS[choice].icon} ${ITEMS[choice].name}` : 'Chọn một món để tặng'}
          </button>
        </div>

        <div className="text-[11px] font-bold text-amber-800">
          Đã biết:{' '}
          {known.length === 0
            ? 'chưa tặng gì, thử xem họ thích món nào nhé!'
            : known.map(({ item, reaction }) => (
                <span key={item} className="mr-1.5 whitespace-nowrap">
                  {REACTION_ICON[reaction]}
                  {ITEMS[item].icon}
                </span>
              ))}
        </div>
      </div>
    </ModalShell>
  );
}

// A resident's card: chat, gifts and how close you are
export function ResidentModal() {
  const id = useGameStore((s) => s.activeResident);
  return id ? <ResidentCard key={id} id={id} /> : null;
}
