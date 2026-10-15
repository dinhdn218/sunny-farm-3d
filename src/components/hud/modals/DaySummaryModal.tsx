'use client';

import { useGameStore } from '@/store/useGameStore';
import { CROP_LIST } from '@/config/crops';
import { IN_SEASON_BONUS_PERCENT, SEASONS, WEATHERS } from '@/config/seasons';
import { dayInSeason, seasonOf } from '@/lib/seasons';

export function DaySummaryModal() {
  const summary = useGameStore((s) => s.lastDaySummary);
  const setActiveModal = useGameStore((s) => s.setActiveModal);

  if (!summary) return null;

  const today = summary.day + 1;
  const seasonId = seasonOf(today);
  const season = SEASONS[seasonId];
  const weather = WEATHERS[summary.weather];
  const forecast = WEATHERS[summary.forecast];
  const newSeason = dayInSeason(today) === 1;
  const inSeasonCrops = CROP_LIST.filter((c) => c.season === seasonId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="parchment-panel relative w-full max-w-md rounded-3xl p-6 text-center">
        <div className="mx-auto -mt-12 mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-amber-900 bg-amber-500 text-3xl shadow-lg">
          🐓
        </div>
        <h2 className="text-2xl font-black text-amber-950">
          {season.icon} Ngày {today} - {season.name}
        </h2>
        <p className="mb-3 text-xs font-bold text-amber-800">
          Bạn đã nghỉ ngơi khỏe khoắn và hồi phục 100% Thể lực.
        </p>

        {newSeason && (
          <p className="mb-3 rounded-xl border-2 border-amber-600/40 bg-amber-200/80 px-3 py-1.5 text-xs font-black text-amber-900">
            {season.icon} {season.name} đã đến!{' '}
            {inSeasonCrops.map((c) => `${c.icon} ${c.name}`).join(', ')} đúng mùa, bán +{IN_SEASON_BONUS_PERCENT}% giá.
          </p>
        )}

        <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border-2 border-sky-700/30 bg-sky-50/90 px-4 py-2 text-xs font-bold text-sky-900">
          <span>
            {weather.icon} Hôm nay: {weather.name}
          </span>
          <span>
            Dự báo ngày mai: {forecast.icon} {forecast.name}
          </span>
        </div>

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
            {summary.rainWatered > 0 && (
              <div className="flex justify-between">
                <span>
                  {weather.icon} {summary.weather === 'snow' ? 'Tuyết tan' : 'Mưa'} đã tưới giúp:
                </span>
                <span className="text-sky-700">{summary.rainWatered} ô</span>
              </div>
            )}
            {summary.petNote && <div className="text-emerald-800">{summary.petNote}</div>}
            {summary.honeyMade > 0 && (
              <div className="flex justify-between">
                <span>🍯 Tổ Ong làm thêm Mật Ong:</span>
                <span className="text-amber-700">{summary.honeyMade} hũ</span>
              </div>
            )}
            {summary.newLetters > 0 && (
              <div className="flex justify-between">
                <span>✉️ Thư mới trong Hộp Thư:</span>
                <span className="text-sky-700">{summary.newLetters} thư</span>
              </div>
            )}
            {summary.newOrders > 0 && (
              <div className="flex justify-between">
                <span>📦 Đơn hàng mới trên Bảng Đơn Hàng:</span>
                <span className="text-violet-700">{summary.newOrders} đơn</span>
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
