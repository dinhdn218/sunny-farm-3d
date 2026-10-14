import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '@/store/useGameStore';
import { createNewGameSave } from '@/lib/newGame';
import { SAVE_VERSION } from '@/lib/saveData';

const STORAGE_KEY = 'sunny-farm-3d-v3';

const storeSaved = (state: Record<string, unknown>, version = SAVE_VERSION) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version }));

beforeEach(() => {
  localStorage.clear();
});

describe('loading the saved game', () => {
  it('finishes loading for a first-time player with nothing saved', async () => {
    await useGameStore.persist.rehydrate();
    expect(useGameStore.persist.hasHydrated()).toBe(true);
  });

  it('gives a save the story quests added to the game since it was written', async () => {
    const save = createNewGameSave();
    storeSaved({ ...save, quests: save.quests.filter((q) => q.id !== 'm_machine') });

    await useGameStore.persist.rehydrate();

    expect(useGameStore.getState().quests.some((q) => q.id === 'm_machine')).toBe(true);
  });

  it('never restores a signed-in account from storage', async () => {
    storeSaved({
      ...createNewGameSave(),
      userProfile: { id: 'google_x1', email: 'farmer@gmail.com', name: 'A', avatarUrl: '', provider: 'google' },
    });

    await useGameStore.persist.rehydrate();

    expect(useGameStore.getState().userProfile).toBeNull();
  });

  it('upgrades a version 1 save when loading it', async () => {
    const { items: _items, shippingBin: _bin, machines: _machines, ...v1 } = createNewGameSave();
    storeSaved(
      {
        ...v1,
        harvested: { carrot: 3, wheat: 0, tomato: 0, pumpkin: 0 },
        animalProducts: { egg: 0, wool: 2, milk: 0 },
        shippingBin: { carrot: 0, wheat: 0, tomato: 0, pumpkin: 0 },
      },
      1
    );

    await useGameStore.persist.rehydrate();

    expect(useGameStore.getState().items).toEqual({ carrot: 3, wool: 2 });
  });
});
