'use client';

import { useGameStore } from '@/store/useGameStore';

export function DaySummaryModal() {
  const summary = useGameStore((s) => s.lastDaySummary);
  const setActiveModal = useGameStore((s) => s.setActiveModal);

  if (!summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="parchment-panel relative w-full max-w-md rounded-3xl p-6 text-center">
        <div className="mx-auto -mt-12 mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-amber-900 bg-amber-500 text-3xl shadow-lg">
          🐓
        </div>
        <h2 className="text-2xl font-black text-amber-950">
          🌞 Ngày {summary.day + 1} - Mùa Xuân
        </h2>
        <p className="mb-4 text-xs font-bold text-amber-800">
          Bạn đã nghỉ ngơi khỏe khoắn và hồi phục 100% Thể lực.
        </p>

        <div className="mb-4 space-y-2 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-4 text-left">
          <div className="border-b border-amber-700/20 pb-1 text-xs font-black uppercase text-amber-800">
            📊 Báo Cáo Nông Trại
          </div>
          <div className="space-y-1.5 text-sm font-bold text-amber-950">
            <div className="flex justify-between">
              <span>🌱 Cây lớn thêm đêm qua:</span>
              <span className="text-emerald-700">{summary.cropsGrownCount} ô</span>
            </div>
            <div className="flex justify-between">
              <span>✨ Cây đã chín chờ thu hoạch:</span>
              <span className="text-amber-700">{summary.readyCount} ô</span>
            </div>
            <div className="flex justify-between">
              <span>🥚 Vật nuôi có sản phẩm mới:</span>
              <span className="text-sky-700">{summary.animalProductsReady} con</span>
            </div>
            {summary.sprinklerWatered > 0 && (
              <div className="flex justify-between">
                <span>💦 Bình phun đã tưới sẵn:</span>
                <span className="text-sky-700">{summary.sprinklerWatered} ô</span>
              </div>
            )}
            {summary.batchesReady > 0 && (
              <div className="flex justify-between">
                <span>🏭 Mẻ chế biến đã xong, chờ thu:</span>
                <span className="text-amber-700">{summary.batchesReady} máy</span>
              </div>
            )}
            {summary.soldItems.map((item) => (
              <div key={item.label} className="flex justify-between text-xs">
                <span>
                  {item.icon} {item.label} x{item.count}
                </span>
                <span className="text-amber-700">+{item.gold}🪙</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t-2 border-amber-700/30 pt-2 text-base font-black text-emerald-800">
            <span>Doanh thu Rương bán hàng:</span>
            <span className="text-lg">🪙 +{summary.totalGoldEarned} Vàng</span>
          </div>
        </div>

        <p className="mb-4 text-xs font-bold text-sky-800">
          📅 Nhiệm vụ hằng ngày mới đã sẵn sàng trong Bảng Nhiệm Vụ!
        </p>

        <button
          onClick={() => setActiveModal(null)}
          className="game-btn w-full rounded-2xl border-2 border-emerald-900 bg-emerald-600 py-3 text-base font-black text-white hover:bg-emerald-500"
        >
          🌻 Bắt Đầu Ngày Mới!
        </button>
      </div>
    </div>
  );
}
