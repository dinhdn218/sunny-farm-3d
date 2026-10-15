'use client';

import { useGameStore } from '@/store/useGameStore';
import { ItemId, Order } from '@/types/game';
import { ITEMS } from '@/config/items';
import { hasItems } from '@/lib/inventory';
import { levelInfo, xpFor } from '@/lib/leveling';
import { EXTRA_SLOT_LEVEL, orderSlots } from '@/lib/orders';
import { ModalShell } from './ModalShell';

function OrderCard({ order }: { order: Order }) {
  const items = useGameStore((s) => s.items);
  const deliverOrder = useGameStore((s) => s.deliverOrder);
  const discardOrder = useGameStore((s) => s.discardOrder);
  const ready = hasItems(items, order.items);
  // Experience for the order itself and for the gold it pays
  const xp = xpFor('deliver_order', 1) + xpFor('earn_gold', order.rewardGold);

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border-2 p-4 ${
        ready ? 'border-emerald-600 bg-emerald-50/90' : 'border-amber-700/40 bg-amber-100/95'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-amber-950">📝 Đơn của {order.customer}</span>
        {ready && (
          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
            ✓ Đủ hàng
          </span>
        )}
      </div>

      <ul className="space-y-1.5">
        {(Object.entries(order.items) as [ItemId, number][]).map(([id, need]) => {
          const have = items[id] ?? 0;
          return (
            <li key={id} className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-1.5">
              <span className="flex items-center gap-2 text-xs font-black text-amber-950">
                <span className="text-xl leading-none">{ITEMS[id].icon}</span>
                {ITEMS[id].name}
              </span>
              <span
                className={`text-xs font-black tabular-nums ${have >= need ? 'text-emerald-700' : 'text-red-600'}`}
              >
                {Math.min(have, need)}/{need}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-amber-900">
          <span>🪙 +{order.rewardGold}</span>
          {order.rewardGems > 0 && <span>💎 +{order.rewardGems}</span>}
          <span>⭐ +{xp} XP</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => discardOrder(order.id)}
            title="Bỏ đơn này, sáng mai ô này có đơn mới"
            className="rounded-lg px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200"
          >
            Từ chối
          </button>
          <button
            onClick={() => deliverOrder(order.id)}
            disabled={!ready}
            className={`rounded-xl px-3 py-1.5 text-xs font-black ${
              ready
                ? 'game-btn bg-emerald-600 text-white hover:bg-emerald-500'
                : 'cursor-not-allowed bg-slate-200 text-slate-400'
            }`}
          >
            📦 Giao Hàng
          </button>
        </div>
      </div>
    </div>
  );
}

// Residents' orders: deliver goods from the bag for half again their price, new orders every morning
export function OrderBoardModal() {
  const orders = useGameStore((s) => s.orders);
  const gold = useGameStore((s) => s.gold);
  const level = useGameStore((s) => levelInfo(s.xp).level);
  const empty = Math.max(0, orderSlots(level) - orders.length);

  return (
    <ModalShell
      icon="📦"
      title="Bảng Đơn Hàng"
      subtitle="Cư dân đặt hàng và trả gấp rưỡi giá bán. Ô trống sẽ có đơn mới vào sáng hôm sau."
      maxWidth="max-w-3xl"
      headerRight={
        <div className="rounded-xl bg-amber-900 px-3 py-1.5 text-sm font-black text-yellow-300">
          🪙 {gold} Vàng
        </div>
      }
    >
      <div className="grid gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <div
            key={`empty_${i}`}
            className="flex min-h-[150px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-amber-700/30 bg-amber-50/50 p-4 text-center"
          >
            <span className="text-2xl opacity-60">📭</span>
            <span className="text-xs font-black text-amber-800">Ô trống</span>
            <span className="text-[11px] font-bold text-amber-700">Sáng mai sẽ có đơn mới.</span>
          </div>
        ))}
      </div>
      {level < EXTRA_SLOT_LEVEL && (
        <p className="mt-3 text-center text-[11px] font-bold text-amber-700">
          🔒 Lên cấp {EXTRA_SLOT_LEVEL} để mở thêm ô đơn hàng thứ 4.
        </p>
      )}
    </ModalShell>
  );
}
