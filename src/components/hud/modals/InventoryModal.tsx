'use client';

import { useGameStore } from '@/store/useGameStore';
import { ITEMS, ITEM_LIST } from '@/config/items';
import { instantSellPrice } from '@/lib/inventory';
import { marketDay, marketPrice } from '@/lib/market';
import { IN_SEASON_BONUS_PERCENT, SEASONS } from '@/config/seasons';
import { isInSeason, seasonOf, seasonalPrice } from '@/lib/seasons';
import { ItemId } from '@/types/game';
import { ModalShell } from './ModalShell';

export function InventoryModal() {
  const day = useGameStore((s) => s.day);
  const items = useGameStore((s) => s.items);
  const shippingBin = useGameStore((s) => s.shippingBin);
  const sellNow = useGameStore((s) => s.sellNow);
  const sellAllNow = useGameStore((s) => s.sellAllNow);
  const moveToBin = useGameStore((s) => s.moveToBin);
  const returnFromBin = useGameStore((s) => s.returnFromBin);
  const depositAllToBin = useGameStore((s) => s.depositAllToBin);
  const setActiveModal = useGameStore((s) => s.setActiveModal);

  const bag = ITEM_LIST.filter((item) => (items[item.id] ?? 0) > 0);
  const bin = ITEM_LIST.filter((item) => (shippingBin[item.id] ?? 0) > 0);
  const bagNowValue = bag.reduce((sum, item) => sum + (items[item.id] ?? 0) * instantSellPrice(item.id), 0);
  const binValue = bin.reduce((sum, item) => sum + (shippingBin[item.id] ?? 0) * seasonalPrice(item.id, day), 0);
  const hot = ITEMS[marketDay(day).hot];
  // In-season crops earn their bonus only through the bin (and the market), not by selling now
  const seasonTag = (id: ItemId) =>
    isInSeason(id, day) && (
      <span
        title={`Đúng mùa: bán qua Rương hoặc Chợ Phiên được +${IN_SEASON_BONUS_PERCENT}%`}
        className="ml-1 inline-block whitespace-nowrap rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white"
      >
        {SEASONS[seasonOf(day)].icon} +{IN_SEASON_BONUS_PERCENT}%
      </span>
    );

  return (
    <ModalShell
      icon="📦"
      title="Kho Đồ & Rương Bán Hàng"
      subtitle="Gửi Rương để bán đủ giá khi Qua Ngày, hoặc Bán Ngay lấy tiền liền với 70% giá"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-rose-400/50 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-900">
        <span>
          🔥 Chợ Phiên hôm nay đang săn {hot.icon} {hot.name}: 🪙{marketPrice(hot.id, day)} (giá thường 🪙
          {seasonalPrice(hot.id, day)})
        </span>
        <button
          onClick={() => setActiveModal('market')}
          className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-black text-white hover:bg-rose-400"
        >
          Xem Bảng Giá
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
        <div className="flex flex-col rounded-2xl border-2 border-amber-700/40 bg-amber-100/80 p-4">
          <h3 className="mb-2 flex items-center justify-between text-base font-black text-amber-950">
            <span>🎒 Giỏ Đồ</span>
            <button
              onClick={depositAllToBin}
              disabled={bag.length === 0}
              className="rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600 disabled:bg-slate-300"
            >
              Bỏ hết vào Rương
            </button>
          </h3>
          <div className="flex-1 space-y-2">
            {bag.length === 0 && (
              <p className="text-xs font-bold text-amber-800">
                Giỏ đang trống. Nông sản thu hoạch, sản phẩm chăn nuôi và hàng chế biến sẽ nằm ở đây.
              </p>
            )}
            {bag.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-700/20 bg-white/80 px-3 py-2"
              >
                <span className="text-xs font-black text-amber-950">
                  {item.icon} {item.name} x{items[item.id]}
                  {seasonTag(item.id)}
                </span>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => moveToBin(item.id, 1)}
                    className="rounded-lg bg-amber-600 px-2 py-1 text-[11px] font-extrabold text-white hover:bg-amber-500"
                  >
                    Gửi Rương ➔
                  </button>
                  <button
                    onClick={() => sellNow(item.id, 1)}
                    title="Bán ngay với 70% giá"
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-extrabold text-white hover:bg-emerald-500"
                  >
                    ⚡ {instantSellPrice(item.id)}🪙
                  </button>
                </div>
              </div>
            ))}
          </div>
          {bag.length > 0 && (
            <button
              onClick={() => sellAllNow()}
              className="game-btn mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500"
            >
              ⚡ Bán Ngay Cả Giỏ (+{bagNowValue}🪙, 70% giá)
            </button>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-2xl border-2 border-red-800/40 bg-red-50/90 p-4">
          <div>
            <h3 className="mb-2 flex items-center justify-between text-base font-black text-red-950">
              <span>📮 Rương Bán Hàng</span>
              <span className="text-xs font-extrabold text-red-700">Đủ giá khi Qua Ngày</span>
            </h3>
            <div className="mb-3 space-y-2">
              {bin.length === 0 && (
                <p className="text-xs font-bold text-red-900">
                  Rương trống. Gửi đồ vào đây để bán đủ 100% giá sau một đêm.
                </p>
              )}
              {bin.map((item) => {
                const qty = shippingBin[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-red-800/20 bg-white/80 px-3 py-2"
                  >
                    <span className="text-xs font-black text-red-950">
                      {item.icon} {item.name} x{qty} (+{qty * seasonalPrice(item.id, day)}🪙)
                      {seasonTag(item.id)}
                    </span>
                    <button
                      onClick={() => returnFromBin(item.id, 1)}
                      className="rounded-lg bg-slate-600 px-2 py-1 text-xs font-extrabold text-white"
                    >
                      Lấy lại
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border-t-2 border-red-800/20 pt-3">
            <div className="text-xs font-bold text-red-900">Dự kiến thu về khi Qua Ngày:</div>
            <div className="text-lg font-black text-amber-700">🪙 +{binValue} Vàng</div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
