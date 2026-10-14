'use client';

import { useGameStore } from '@/store/useGameStore';
import { CROP_LIST } from '@/config/crops';
import { ANIMAL_LIST } from '@/config/animals';
import { ModalShell } from './ModalShell';

export function InventoryModal() {
  const harvested = useGameStore((s) => s.harvested);
  const shippingBin = useGameStore((s) => s.shippingBin);
  const animalProducts = useGameStore((s) => s.animalProducts);
  const sellAllInInventory = useGameStore((s) => s.sellAllInInventory);
  const depositToShippingBin = useGameStore((s) => s.depositToShippingBin);
  const moveCropToBin = useGameStore((s) => s.moveCropToBin);
  const returnCropFromBin = useGameStore((s) => s.returnCropFromBin);

  const estimatedGold = CROP_LIST.reduce(
    (total, crop) => total + (shippingBin[crop.id] || 0) * crop.sellPrice,
    0
  );

  return (
    <ModalShell
      icon="📦"
      title="Kho Nông Sản & Rương Bán Hàng"
      subtitle="Bán nông sản ngay lập tức hoặc gửi vào Rương để tổng kết cuối ngày"
    >
      <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-amber-700/40 bg-amber-100/80 p-4">
          <h3 className="mb-2 flex items-center justify-between text-base font-black text-amber-950">
            <span>🎒 Nông Sản Trong Giỏ</span>
            <button
              onClick={depositToShippingBin}
              className="rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600"
            >
              Bỏ hết vào Rương
            </button>
          </h3>
          <div className="space-y-2">
            {CROP_LIST.map((crop) => {
              const qty = harvested[crop.id] || 0;
              return (
                <div
                  key={crop.id}
                  className="flex items-center justify-between rounded-xl border border-amber-700/20 bg-white/80 px-3 py-2"
                >
                  <span className="text-xs font-black text-amber-950">
                    {crop.icon} {crop.name} x{qty}
                  </span>
                  <button
                    disabled={qty <= 0}
                    onClick={() => moveCropToBin(crop.id, 1)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                      qty > 0 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    Gửi Rương ➔
                  </button>
                </div>
              );
            })}
            {ANIMAL_LIST.map((animal) => (
              <div
                key={animal.productId}
                className="flex items-center justify-between rounded-xl border border-amber-700/20 bg-white/80 px-3 py-2"
              >
                <span className="text-xs font-black text-amber-950">
                  {animal.productIcon} {animal.productName} x
                  {animalProducts[animal.productId] || 0}
                </span>
                <span className="text-[10px] font-bold text-amber-700">
                  Bán khi Qua Ngày
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border-2 border-red-800/40 bg-red-50/90 p-4">
          <div>
            <h3 className="mb-2 flex items-center justify-between text-base font-black text-red-950">
              <span>📮 Rương Bán Hàng</span>
              <span className="text-xs font-extrabold text-red-700">Thu tiền khi Qua Ngày</span>
            </h3>
            <div className="mb-3 space-y-2">
              {CROP_LIST.map((crop) => {
                const qty = shippingBin[crop.id] || 0;
                return (
                  <div
                    key={crop.id}
                    className="flex items-center justify-between rounded-xl border border-red-800/20 bg-white/80 px-3 py-2"
                  >
                    <span className="text-xs font-black text-red-950">
                      {crop.icon} {crop.name} x{qty} (+{qty * crop.sellPrice}🪙)
                    </span>
                    <button
                      disabled={qty <= 0}
                      onClick={() => returnCropFromBin(crop.id, 1)}
                      className={`rounded-lg px-2 py-1 text-xs font-extrabold ${
                        qty > 0 ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      Lấy lại
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between border-t-2 border-red-800/20 pt-3">
            <div>
              <div className="text-xs font-bold text-red-900">Dự kiến thu về:</div>
              <div className="text-lg font-black text-amber-700">🪙 +{estimatedGold} Vàng</div>
            </div>
            <button
              onClick={sellAllInInventory}
              className="game-btn rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500"
            >
              ⚡ Bán Ngay Lập Tức
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
