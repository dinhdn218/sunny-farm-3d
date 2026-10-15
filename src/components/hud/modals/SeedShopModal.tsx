'use client';

import { useGameStore } from '@/store/useGameStore';
import { CROP_LIST } from '@/config/crops';
import { IN_SEASON_BONUS_PERCENT, SEASONS } from '@/config/seasons';
import { isInSeason, seasonalPrice } from '@/lib/seasons';
import {
  MAX_TOOL_TIER,
  SPRINKLER_PRICE,
  FERTILIZER_PRICE,
  TOOL_NAMES,
  TOOL_UPGRADES,
  UpgradableTool,
  waterCapacity,
} from '@/lib/tools';
import { ModalShell } from './ModalShell';

const TOOL_ICONS: Record<UpgradableTool, string> = { hoe: '⛏️', water: '🚿' };

// What each tier of a tool does, shown on its upgrade card
const tierEffect = (tool: UpgradableTool, tier: number) => {
  const area = ['1 ô', '3 ô cùng hàng', '3×3 ô'][tier];
  const energy = tier === 0 ? '2⚡ mỗi ô' : '1⚡ mỗi ô';
  return tool === 'hoe'
    ? `Cày ${area} mỗi lần (${energy})`
    : `Tưới ${area} mỗi lần, bình ${waterCapacity(tier)} nước (${energy})`;
};

function ToolUpgradeCard({ tool }: { tool: UpgradableTool }) {
  const tier = useGameStore((s) => s.toolTiers[tool]);
  const gold = useGameStore((s) => s.gold);
  const gems = useGameStore((s) => s.gems);
  const buyToolUpgrade = useGameStore((s) => s.buyToolUpgrade);
  const maxed = tier >= MAX_TOOL_TIER;
  const price = maxed ? null : TOOL_UPGRADES[tool][tier];
  const affordable = !!price && gold >= price.gold && gems >= price.gems;

  return (
    <div className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-lime-700/40 bg-lime-50/90 p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-lime-600 bg-lime-200 text-2xl">
          {TOOL_ICONS[tool]}
        </div>
        <div className="flex-1">
          <div className="text-sm font-black text-amber-950">{TOOL_NAMES[tool][tier]}</div>
          <p className="text-xs text-amber-800">Đang dùng: {tierEffect(tool, tier)}</p>
          {!maxed && (
            <p className="text-[11px] font-black text-emerald-800">
              ➔ {TOOL_NAMES[tool][tier + 1]}: {tierEffect(tool, tier + 1)}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end border-t border-lime-700/20 pt-2">
        {maxed ? (
          <span className="rounded-xl bg-amber-300 px-3 py-1 text-xs font-black text-amber-950">⭐ Cấp tối đa</span>
        ) : (
          <button
            onClick={() => buyToolUpgrade(tool)}
            disabled={!affordable}
            className={`game-btn rounded-xl px-3 py-1 text-xs font-black text-white ${
              affordable ? 'bg-lime-600 hover:bg-lime-500' : 'bg-slate-400'
            }`}
          >
            Nâng Cấp (🪙{price?.gold}
            {price?.gems ? ` + 💎${price.gems}` : ''})
          </button>
        )}
      </div>
    </div>
  );
}

function FertilizerCard() {
  const gold = useGameStore((s) => s.gold);
  const fertilizer = useGameStore((s) => s.fertilizer);
  const buyFertilizer = useGameStore((s) => s.buyFertilizer);

  return (
    <div className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-lime-700/40 bg-lime-50/90 p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-lime-600 bg-lime-200 text-2xl">
          🪴
        </div>
        <div className="flex-1">
          <div className="flex justify-between">
            <span className="text-sm font-black text-amber-950">Phân Bón Hữu Cơ</span>
            <span className="text-xs font-bold text-amber-800">Kho: {fertilizer}</span>
          </div>
          <p className="text-xs text-amber-800">
            Bón lên ô đất đã cuốc (phím 7): lần thu hoạch tới ở ô đó được gấp đôi nông sản.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-lime-700/20 pt-2">
        {[1, 5].map((amount) => (
          <button
            key={amount}
            onClick={() => buyFertilizer(amount)}
            disabled={gold < FERTILIZER_PRICE * amount}
            className={`game-btn rounded-xl px-3 py-1 text-xs font-black text-white ${
              gold >= FERTILIZER_PRICE * amount ? 'bg-lime-700 hover:bg-lime-600' : 'bg-slate-400'
            }`}
          >
            Mua {amount} (🪙{FERTILIZER_PRICE * amount})
          </button>
        ))}
      </div>
    </div>
  );
}

function SprinklerCard() {
  const gold = useGameStore((s) => s.gold);
  const sprinklers = useGameStore((s) => s.sprinklers);
  const placed = useGameStore((s) => s.tiles.filter((t) => t.sprinkler).length);
  const buySprinkler = useGameStore((s) => s.buySprinkler);
  const startPlacingSprinkler = useGameStore((s) => s.startPlacingSprinkler);

  return (
    <div className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-sky-700/40 bg-sky-50/90 p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-sky-600 bg-sky-200 text-2xl">
          💦
        </div>
        <div className="flex-1">
          <div className="flex justify-between">
            <span className="text-sm font-black text-amber-950">Bình Phun Tự Động</span>
            <span className="text-xs font-bold text-amber-800">
              Kho: {sprinklers} • Đã đặt: {placed}
            </span>
          </div>
          <p className="text-xs text-amber-800">
            Đặt lên một ô ruộng trống; mỗi sáng tự tưới 8 ô xung quanh. Dùng Giỏ (phím 3) để cất lại.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-sky-700/20 pt-2">
        <button
          onClick={buySprinkler}
          disabled={gold < SPRINKLER_PRICE}
          className={`game-btn rounded-xl px-3 py-1 text-xs font-black text-white ${
            gold >= SPRINKLER_PRICE ? 'bg-sky-600 hover:bg-sky-500' : 'bg-slate-400'
          }`}
        >
          Mua (🪙{SPRINKLER_PRICE})
        </button>
        <button
          onClick={startPlacingSprinkler}
          disabled={sprinklers === 0}
          className={`game-btn rounded-xl px-3 py-1 text-xs font-black text-white ${
            sprinklers > 0 ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-400'
          }`}
        >
          Đặt Lên Ruộng
        </button>
      </div>
    </div>
  );
}

export function SeedShopModal() {
  const day = useGameStore((s) => s.day);
  const gold = useGameStore((s) => s.gold);
  const seeds = useGameStore((s) => s.seeds);
  const breadCount = useGameStore((s) => s.breadCount);
  const buySeed = useGameStore((s) => s.buySeed);
  const buyBread = useGameStore((s) => s.buyBread);

  return (
    <ModalShell
      icon="🏪"
      title="Tạp Hóa Hạt Giống Nông Trại"
      subtitle="Mua hạt giống, thức ăn hồi thể lực, nâng cấp công cụ và bình phun"
      headerRight={
        <div className="rounded-xl bg-amber-900 px-3 py-1.5 text-sm font-black text-yellow-300">
          🪙 {gold} Vàng
        </div>
      }
    >
      <div className="overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CROP_LIST.map((crop) => (
            <div
              key={crop.id}
              className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-amber-600 bg-amber-300 text-2xl">
                  {crop.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-black text-amber-950">Hạt {crop.name}</span>
                    <span className="text-xs font-bold text-amber-800">
                      Có: {seeds[crop.id] || 0}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800">{crop.description}</p>
                  <div className="text-[11px] font-black text-emerald-800">
                    Bán: 🪙 {seasonalPrice(crop.id, day)} Vàng
                  </div>
                  {isInSeason(crop.id, day) ? (
                    <div className="text-[11px] font-black text-emerald-700">
                      {SEASONS[crop.season].icon} Đúng mùa: bán +{IN_SEASON_BONUS_PERCENT}% giá
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-amber-700">
                      {SEASONS[crop.season].icon} Bán +{IN_SEASON_BONUS_PERCENT}% vào {SEASONS[crop.season].name}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-amber-700/20 pt-2">
                <button
                  onClick={() => buySeed(crop.id, 1)}
                  className="game-btn rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white"
                >
                  Mua 1 (🪙{crop.seedPrice})
                </button>
                <button
                  onClick={() => buySeed(crop.id, 5)}
                  className="game-btn rounded-xl bg-amber-700 px-3 py-1 text-xs font-black text-white"
                >
                  Mua 5 (🪙{crop.seedPrice * 5})
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-amber-600 bg-amber-300 text-2xl">
                🥖
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-sm font-black text-amber-950">Bánh Mì Nóng</span>
                  <span className="text-xs font-bold text-amber-800">Có: {breadCount}</span>
                </div>
                <p className="text-xs text-amber-800">Ăn để hồi +45 Thể lực (phím 5).</p>
                <div className="text-[11px] font-black text-emerald-800">Giá: 🪙 25 Vàng</div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-amber-700/20 pt-2">
              <button
                onClick={buyBread}
                className="game-btn rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white"
              >
                Mua 1 (🪙25)
              </button>
            </div>
          </div>
        </div>

        <div className="mb-2 mt-4 text-xs font-black uppercase text-amber-900">🛠️ Nâng Cấp Công Cụ, Tưới Tự Động & Phân Bón</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ToolUpgradeCard tool="hoe" />
          <ToolUpgradeCard tool="water" />
          <SprinklerCard />
          <FertilizerCard />
        </div>
      </div>
    </ModalShell>
  );
}
