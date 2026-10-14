'use client';

import { useGameStore } from '@/store/useGameStore';
import { ANIMAL_LIST, ANIMALS } from '@/config/animals';
import { ModalShell } from './ModalShell';

export function RanchModal() {
  const gold = useGameStore((s) => s.gold);
  const animals = useGameStore((s) => s.animals);
  const animalFeed = useGameStore((s) => s.animalFeed);
  const animalProducts = useGameStore((s) => s.animalProducts);
  const useGlbModels = useGameStore((s) => s.useGlbModels);
  const toggleGlbModels = useGameStore((s) => s.toggleGlbModels);
  const buyAnimal = useGameStore((s) => s.buyAnimal);
  const buyAnimalFeed = useGameStore((s) => s.buyAnimalFeed);
  const interactAnimal = useGameStore((s) => s.interactAnimal);
  const feedAllAnimals = useGameStore((s) => s.feedAllAnimals);
  const sellAllInInventory = useGameStore((s) => s.sellAllInInventory);

  return (
    <ModalShell
      icon="🐄"
      title="Chuồng Trại Chăn Nuôi"
      subtitle={`Nuôi Gà, Cừu, Bò Sữa để thu Trứng, Lông Cừu và Sữa mỗi sáng • Thức ăn: ${animalFeed} 🌾`}
      maxWidth="max-w-3xl"
      headerRight={
        <>
          <button
            onClick={toggleGlbModels}
            className="game-btn rounded-xl bg-teal-600 px-3 py-1 text-xs font-black text-white"
          >
            {useGlbModels ? '🎨 GLB: Bật' : '🧱 Stylized'}
          </button>
          <div className="rounded-xl bg-amber-900 px-3 py-1 text-xs font-black text-yellow-300 sm:text-sm">
            🪙 {gold}
          </div>
        </>
      }
    >
      <div className="overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ANIMAL_LIST.map((cfg) => (
            <div
              key={cfg.species}
              className="flex flex-col justify-between gap-2 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-600 bg-amber-300 text-2xl">
                  {cfg.icon}
                </div>
                <div>
                  <div className="text-sm font-black text-amber-950">{cfg.name}</div>
                  <p className="text-[11px] font-bold text-amber-800">{cfg.description}</p>
                  <div className="text-[11px] font-black text-emerald-800">
                    {cfg.productIcon} {cfg.productName}: 🪙 {cfg.productSellPrice}
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t border-amber-700/20 pt-2">
                <button
                  onClick={() => buyAnimal(cfg.species)}
                  className="game-btn rounded-xl bg-amber-600 px-3 py-1 text-xs font-black text-white"
                >
                  Mua (🪙{cfg.buyPrice})
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-2 mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-black uppercase text-amber-900">
            🏡 Đàn Vật Nuôi ({animals.length}/9)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => buyAnimalFeed(5)}
              className="game-btn rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white"
            >
              🌾 Mua 5 Thức Ăn (🪙50)
            </button>
            <button
              onClick={feedAllAnimals}
              className="game-btn rounded-xl bg-amber-700 px-3 py-1 text-xs font-black text-white"
            >
              ❤️ Cho Cả Đàn Ăn
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {animals.map((a) => {
            const cfg = ANIMALS[a.species];
            return (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-amber-700/20 bg-white/80 px-3 py-2"
              >
                <div>
                  <div className="text-xs font-black text-amber-950">
                    {cfg.icon} {a.name}
                  </div>
                  <div className="text-[10px] font-bold text-amber-700">
                    Thân thiết {a.affection}% • {a.fedToday ? '❤️ Đã ăn' : '🌾 Đói'}
                  </div>
                </div>
                <button
                  onClick={() => interactAnimal(a.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                    a.hasProduct
                      ? 'animate-bounce bg-amber-400 text-amber-950'
                      : a.fedToday
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {a.hasProduct ? `${cfg.productIcon} Thu` : a.fedToday ? 'Vuốt ve' : 'Cho ăn'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-amber-700/40 bg-amber-100/90 p-3">
          <div className="flex gap-3 text-xs font-black text-amber-950">
            <span>🥚 Trứng: {animalProducts.egg}</span>
            <span>🧶 Lông cừu: {animalProducts.wool}</span>
            <span>🥛 Sữa: {animalProducts.milk}</span>
          </div>
          <button
            onClick={sellAllInInventory}
            className="game-btn rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500"
          >
            ⚡ Bán Ngay Lập Tức
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
