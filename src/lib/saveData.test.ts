import { describe, expect, it } from 'vitest';
import { createNewGameSave } from '@/lib/newGame';
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

describe('saveFromCloud', () => {
  it('fills fields missing from an older cloud save with new-game values', () => {
    const save = saveFromCloud({ gold: 999, day: 7 }, 1);
    expect(save.gold).toBe(999);
    expect(save.day).toBe(7);
    expect(save.breadCount).toBe(2);
    expect(save.tiles).toHaveLength(256);
  });

  it('drops keys that are not part of a save', () => {
    const save = saveFromCloud({ gold: 5, activeModal: 'map', userProfile: { id: 'x' } }, 1);
    expect(save).not.toHaveProperty('activeModal');
    expect(save).not.toHaveProperty('userProfile');
  });
});
