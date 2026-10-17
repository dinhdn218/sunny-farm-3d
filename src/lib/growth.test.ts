import { describe, expect, it } from 'vitest';
import { TileData } from '@/types/game';
import { createEmptyGrid } from '@/lib/newGame';
import {
  FAST_CROP_MS,
  autoWater,
  canWater,
  cropStatus,
  harvestTile,
  msLeft,
  needsWater,
  plantTile,
  refreshStages,
  stageAt,
  waterTile,
} from './growth';

const HOUR = 3_600_000;
const T = Date.UTC(2026, 9, 20, 3); // 10:00 in Vietnam
const tilled = (over: Partial<TileData> = {}): TileData => ({ ...createEmptyGrid()[0], state: 'tilled', ...over });

describe('a crop on real time', () => {
  it('waits for water, then ripens after its time: carrots in an hour', () => {
    const sown = plantTile(tilled(), 'carrot', T);
    expect(needsWater(sown)).toBe(true);
    expect(stageAt(sown, T + 5 * HOUR)).toBe(1);
    const wet = waterTile(sown, T);
    expect(msLeft(wet, T)).toBe(HOUR);
    expect(stageAt(wet, T + HOUR / 2 - 1)).toBe(1);
    expect(stageAt(wet, T + HOUR / 2)).toBe(2);
    expect(stageAt(wet, T + HOUR)).toBe(3);
  });

  it('starts at once on soil watered before sowing', () => {
    const sown = plantTile(waterTile(tilled(), T), 'pumpkin', T + HOUR);
    expect(msLeft(sown, T + HOUR)).toBe(24 * HOUR);
  });

  it('grows back after picking, from stage 2, once watered again', () => {
    const tomato = waterTile(plantTile(tilled(), 'tomato', T), T);
    const picked = harvestTile({ ...tomato, stage: 3 });
    expect(picked).toMatchObject({ state: 'planted', crop: 'tomato', stage: 2, watered: false, readyAt: null });
    const again = waterTile(picked, T);
    expect(msLeft(again, T)).toBe(3 * HOUR);
    expect(stageAt(again, T + 3 * HOUR)).toBe(3);
  });

  it('leaves dry tilled soil after picking a crop that does not grow back', () => {
    const corn = { ...waterTile(plantTile(tilled(), 'corn', T), T), stage: 3, fertilized: true };
    expect(harvestTile(corn)).toMatchObject({
      state: 'tilled',
      crop: null,
      stage: 0,
      watered: false,
      fertilized: false,
      readyAt: null,
    });
  });

  it("ripens a new player's first crops in five minutes", () => {
    expect(msLeft(waterTile(plantTile(tilled(), 'pumpkin', T, true), T), T)).toBe(FAST_CROP_MS);
  });

  it('never goes back a stage, even if the clock does', () => {
    const [ripe] = refreshStages([waterTile(plantTile(tilled(), 'carrot', T), T)], T + 2 * HOUR);
    expect(ripe.stage).toBe(3);
    expect(stageAt(ripe, T)).toBe(3);
  });

  it('keeps the same array when no crop moved on', () => {
    const tiles = [waterTile(plantTile(tilled(), 'carrot', T), T)];
    expect(refreshStages(tiles, T + 60_000)).toBe(tiles);
  });

  it('starts a crop that was watered before real time came in', () => {
    const old: TileData = { ...tilled(), state: 'planted', crop: 'wheat', stage: 1, watered: true };
    const [started] = refreshStages([old], T);
    expect(msLeft(started, T)).toBe(1.5 * HOUR);
  });

  it('does not water what is growing, ripe or a sprinkler', () => {
    const growing = waterTile(plantTile(tilled(), 'carrot', T), T);
    expect(canWater(growing)).toBe(false);
    expect(canWater({ ...growing, stage: 3, watered: false })).toBe(false);
    expect(canWater(tilled({ sprinkler: true }))).toBe(false);
    expect(canWater(tilled())).toBe(true);
  });

  it('says what a crop needs', () => {
    const sown = plantTile(tilled(), 'carrot', T);
    expect(cropStatus(sown, T)).toBe('💧 Cần tưới để cây bắt đầu lớn');
    expect(cropStatus(waterTile(sown, T), T + 15 * 60_000)).toBe('⏳ Còn 45 phút');
    expect(cropStatus({ ...sown, stage: 3 }, T)).toBe('✨ ĐÃ CHÍN! Click để thu hoạch!');
  });
});

describe('watering by itself', () => {
  const field = () =>
    createEmptyGrid().map((t) =>
      t.id === '5-5'
        ? { ...t, sprinkler: true }
        : t.id === '5-6' || t.id === '9-9'
          ? { ...t, state: 'planted' as const, crop: 'carrot' as const, stage: 1 }
          : t
    );

  it('a sprinkler waters the dry crops around it', () => {
    const { tiles, watered } = autoWater(field(), T, false);
    expect(watered).toBe(1);
    expect(tiles.find((t) => t.id === '5-6')).toMatchObject({ watered: true, readyAt: T + HOUR });
    expect(tiles.find((t) => t.id === '9-9')?.watered).toBe(false);
  });

  it('rain waters every dry worked tile', () => {
    expect(autoWater(field(), T, true).watered).toBe(2);
  });

  it('leaves the field as it was when nothing needed water', () => {
    const tiles = createEmptyGrid();
    expect(autoWater(tiles, T, true).tiles).toBe(tiles);
  });
});
