import { describe, expect, it } from 'vitest';
import { createNewGameSave } from '@/lib/newGame';
import { createInitialQuests } from '@/lib/quests';
import { SAVE_VERSION, isFreshSave, migrateSave, saveFromCloud } from '@/lib/saveData';

describe('isFreshSave', () => {
  it('treats a brand-new game as fresh', () => {
    expect(isFreshSave(createNewGameSave())).toBe(true);
  });

  it('is not fresh once a day has passed', () => {
    expect(isFreshSave({ ...createNewGameSave(), day: 2 })).toBe(false);
  });

  it('is not fresh once any quest has progress', () => {
    const save = createNewGameSave();
    const quests = save.quests.map((q, i) => (i === 0 ? { ...q, progress: 1 } : q));
    expect(isFreshSave({ ...save, quests })).toBe(false);
  });
});

describe('migrateSave', () => {
  const v0 = {
    day: 5,
    gold: 1234,
    tiles: [
      { id: '0-0', r: 0, c: 0, state: 'planted', watered: true, crop: 'carrot', stage: 2, daysWatered: 0 },
    ],
    ownedCosmetics: ['straw_hat', 'crown', 'decor_windmill'],
  };

  it('moves an old 8×8 field into the centre of the 16×16 grid', () => {
    const save = migrateSave(v0, 0);
    expect(save.tiles).toHaveLength(256);
    expect(save.tiles?.[4 * 16 + 4]).toMatchObject({ id: '4-4', r: 4, c: 4, crop: 'carrot', stage: 2 });
    expect(save.ownedPlots).toEqual(['1-1', '2-1', '1-2', '2-2']);
  });

  it('puts decor bought before decor was movable at its old spot', () => {
    expect(migrateSave(v0, 0).decorPlacements).toEqual({
      decor_windmill: { x: -9.2, z: -4.2, rotY: 0 },
    });
  });

  it('credits achievements for days played and wearables already bought', () => {
    const quests = migrateSave(v0, 0).quests ?? [];
    expect(quests.find((q) => q.id === 'a_days')?.progress).toBe(4);
    expect(quests.find((q) => q.id === 'a_fashion')?.progress).toBe(1);
  });

  it('leaves a save at the current version untouched', () => {
    const current = { ...createNewGameSave(), gold: 77 };
    expect(migrateSave(current, SAVE_VERSION)).toEqual(current);
  });
});

describe('migrateSave from version 1', () => {
  const v1 = {
    ...createNewGameSave(),
    harvested: { carrot: 2, wheat: 0, tomato: 1, pumpkin: 0 },
    animalProducts: { egg: 1, wool: 0, milk: 3 },
    shippingBin: { carrot: 0, wheat: 4, tomato: 0, pumpkin: 0 },
  };

  it('puts harvests and animal products in one bag', () => {
    const save = migrateSave(v1, 1);
    expect(save.items).toEqual({ carrot: 2, tomato: 1, egg: 1, milk: 3 });
    expect(save).not.toHaveProperty('harvested');
    expect(save).not.toHaveProperty('animalProducts');
  });

  it('keeps what was waiting in the shipping bin', () => {
    expect(migrateSave(v1, 1).shippingBin).toEqual({ wheat: 4 });
  });

  it('starts without machines and with the free popcorn unused', () => {
    const save = migrateSave(v1, 1);
    expect(save.machines).toEqual({});
    expect(save.lastFreeSnackDay).toBe(0);
  });
});

describe('migrateSave from version 2', () => {
  it('estimates experience from what the achievement counters show', () => {
    const v2 = { ...createNewGameSave(), quests: createInitialQuests(1, { a_harvest: 10, a_days: 4 }) };
    const save = migrateSave(v2, 2);
    expect(save.xp).toBe(50);
    expect(save.loginStreak).toBe(0);
    expect(save.lastGiftDate).toBeNull();
  });
});

describe('migrateSave from version 3', () => {
  it('moves the Halloween candy into the festival purse', () => {
    const v3 = { ...createNewGameSave(), candy: 12 };
    const save = migrateSave(v3, 3);
    expect(save.festivalTokens).toEqual({ halloween: 12 });
    expect(save).not.toHaveProperty('candy');
  });
});

describe('saveFromCloud', () => {
  it('gives an older cloud save the story quests added since', () => {
    const quests = createNewGameSave().quests.filter((q) => q.id !== 'm_machine');
    const save = saveFromCloud({ day: 2, quests }, 1);
    expect(save.quests.some((q) => q.id === 'm_machine')).toBe(true);
  });

  it('fills fields missing from an older cloud save with new-game values', () => {
    const save = saveFromCloud({ gold: 999, day: 7 }, 1);
    expect(save.gold).toBe(999);
    expect(save.day).toBe(7);
    expect(save.breadCount).toBe(2);
    expect(save.tiles).toHaveLength(256);
  });

  it('gives a cloud save from before the order board a full board', () => {
    const { orders: _orders, ...old } = createNewGameSave();
    expect(saveFromCloud({ ...old, day: 12 }, SAVE_VERSION).orders).toHaveLength(3);
  });

  it('keeps the open orders of a cloud save', () => {
    const orders = [{ id: 'ord_5_0', customer: 'Bảo Ngọc 🐱', items: { milk: 1 }, rewardGold: 240, rewardGems: 0 }];
    expect(saveFromCloud({ ...createNewGameSave(), orders }, SAVE_VERSION).orders).toEqual(orders);
  });

  it('drops keys that are not part of a save', () => {
    const save = saveFromCloud({ gold: 5, activeModal: 'map', userProfile: { id: 'x' } }, 1);
    expect(save).not.toHaveProperty('activeModal');
    expect(save).not.toHaveProperty('userProfile');
  });
});

describe('migrateSave from version 4', () => {
  it('starts the collection book from what the save holds', () => {
    const v4 = { ...createNewGameSave(), items: { tomato: 3 }, shippingBin: {}, fishLog: { tuna: { caught: 2, best: 90 } } };
    const save = migrateSave(v4, 4);
    expect([...(save.collected ?? [])].sort()).toEqual(['tomato', 'tuna']);
    expect(save.collectionClaimed).toEqual([]);
  });
});
