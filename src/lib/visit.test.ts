import { describe, expect, it } from 'vitest';
import { ResidentId } from '@/types/game';
import { RESIDENTS } from '@/config/npcs';
import { COSMETICS } from '@/config/cosmetics';
import { plotOfTile } from '@/config/farm';
import { canPlaceBuildPiece, canPlaceDecor } from '@/lib/farmLayout';
import { isMachineId } from '@/config/machines';
import { createNewGameSave } from '@/lib/newGame';
import { farmListFromRows, farmSummary, farmViewOf, residentFarm } from '@/lib/visit';

const IDS = Object.keys(RESIDENTS) as ResidentId[];

describe('residentFarm', () => {
  it("dresses the farmer in the resident's own look and plants their field", () => {
    IDS.forEach((id) => {
      const farm = residentFarm(id);
      expect(farm.playerName).toBe(RESIDENTS[id].name);
      expect(farm.cosmetics).toEqual(RESIDENTS[id].cosmetics);
      const planted = farm.tiles.filter((t) => t.state === 'planted');
      expect(planted.length).toBeGreaterThan(10);
      planted.forEach((t) => expect(farm.ownedPlots).toContain(plotOfTile(t.r, t.c)));
    });
  });

  it('only puts real decorations and machines on free ground', () => {
    IDS.forEach((id) => {
      const farm = residentFarm(id);
      Object.entries(farm.decorPlacements).forEach(([item, p]) => {
        expect(isMachineId(item) || COSMETICS.some((c) => c.id === item && c.category === 'decor')).toBe(true);
        if (!isMachineId(item)) expect(farm.ownedCosmetics).toContain(item);
        expect(canPlaceDecor(item, p.x, p.z, farm.ownedPlots, farm.decorPlacements, farm.buildPieces)).toBe(true);
      });
      farm.buildPieces.forEach((piece) => {
        const others = farm.buildPieces.filter((p) => p !== piece);
        expect(canPlaceBuildPiece(piece.x, piece.z, farm.ownedPlots, farm.decorPlacements, others)).toBe(true);
      });
    });
  });
});

describe('farmViewOf', () => {
  it('keeps only what shows on the farm, nothing private like the purse or the mail', () => {
    const view = farmViewOf(createNewGameSave());
    expect(Object.keys(view).sort()).toEqual(
      ['animals', 'buildPieces', 'cosmetics', 'day', 'decorPlacements', 'machines', 'ownedCosmetics', 'ownedPlots', 'playerName', 'tiles', 'xp'].sort()
    );
  });
});

describe('farmSummary', () => {
  it('counts what grows and lives on the farm, and the farmer level', () => {
    const save = createNewGameSave();
    expect(farmSummary(farmViewOf({ ...save, xp: 2700 }))).toEqual({ level: 10, planted: 3, animals: 3, decor: 0 });
  });
});

describe('farmListFromRows', () => {
  it("lists other farmers' farms with their level, leaving out the player's own", () => {
    const rows = [
      { id: 'me', full_name: 'Tôi', day: 4, xp: 10 },
      { id: 'a', full_name: 'An', day: 12, xp: 2700 },
      { id: 'b', full_name: null, day: null, xp: null },
    ];
    expect(farmListFromRows(rows, 'me')).toEqual([
      { id: 'a', name: 'An', level: 10, day: 12 },
      { id: 'b', name: 'Nông Dân', level: 1, day: 1 },
    ]);
  });
});
