import { describe, expect, it } from 'vitest';
import { ActiveBuff, ItemId } from '@/types/game';
import { FOODS, foodOf } from '@/config/food';
import { ITEMS } from '@/config/items';
import {
  ENERGY_REGEN_MS,
  activeBuff,
  maxEnergyFor,
  netBuffScale,
  nextEnergyIn,
  reelBuffScale,
  settleEnergy,
  spendEnergy,
  walkSpeedScale,
} from '@/lib/food';

const eaten = (id: ActiveBuff['id'], day = 4): ActiveBuff => ({ id, food: 'pumpkin_pie', day });

describe('activeBuff', () => {
  it('works on the day the dish was eaten and wears off after a night’s sleep', () => {
    expect(activeBuff(eaten('angler'), 4)).toBe('angler');
    expect(activeBuff(eaten('angler'), 5)).toBeNull();
    expect(activeBuff(null, 4)).toBeNull();
  });
});

describe('what the buffs do', () => {
  it('raises the most stamina there is after a hearty meal, for the day only', () => {
    expect(maxEnergyFor(null, 4)).toBe(100);
    expect(maxEnergyFor(eaten('stamina'), 4)).toBe(130);
    expect(maxEnergyFor(eaten('stamina'), 5)).toBe(100);
    expect(maxEnergyFor(eaten('swift'), 4)).toBe(100);
  });

  it('each helps with one thing', () => {
    expect([walkSpeedScale, reelBuffScale, netBuffScale].map((scale) => scale(eaten('swift'), 4))).toEqual([1.3, 1, 1]);
    expect([walkSpeedScale, reelBuffScale, netBuffScale].map((scale) => scale(eaten('angler'), 4))).toEqual([1, 1.3, 1]);
    expect([walkSpeedScale, reelBuffScale, netBuffScale].map((scale) => scale(eaten('netter'), 4))).toEqual([1, 1, 1.4]);
    expect([walkSpeedScale, reelBuffScale, netBuffScale].map((scale) => scale(eaten('netter'), 5))).toEqual([1, 1, 1]);
  });
});

describe('food', () => {
  it('comes from the workshop', () => {
    Object.keys(FOODS).forEach((id) => expect(ITEMS[id as ItemId].kind, id).toBe('artisan'));
  });

  it('leaves out what is not eaten on its own: sauces, oil and the scarf', () => {
    (['tomato_sauce', 'fish_sauce', 'truffle_oil', 'wool_scarf', 'carrot', 'egg'] as ItemId[]).forEach((id) =>
      expect(foodOf(id), id).toBeUndefined()
    );
    expect(foodOf('fish_stew')).toEqual({ energy: 30, buff: 'angler' });
  });
});

describe('stamina on real time', () => {
  const T = 1_000_000_000;
  const MIN = 60_000;

  it('comes back a point every three minutes, keeping the time towards the next', () => {
    expect(ENERGY_REGEN_MS).toBe(3 * MIN);
    expect(settleEnergy({ energy: 50, energyAt: T }, 100, T + 7 * MIN)).toEqual({ energy: 52, energyAt: T + 6 * MIN });
  });

  it('stops at the most there is', () => {
    expect(settleEnergy({ energy: 99, energyAt: T }, 100, T + 60 * MIN)).toEqual({ energy: 100, energyAt: T + 60 * MIN });
  });

  it('starts counting from the moment it is spent from full', () => {
    expect(spendEnergy({ energy: 100, energyAt: T }, 4, 100, T + 60 * MIN)).toEqual({ energy: 96, energyAt: T + 60 * MIN });
    expect(nextEnergyIn({ energy: 96, energyAt: T }, 100, T + MIN)).toBe(2 * MIN);
  });

  it('needs no countdown when full', () => {
    expect(nextEnergyIn({ energy: 100, energyAt: T }, 100, T)).toBeNull();
  });

  it('gives a save without a time stamp one', () => {
    expect(settleEnergy({ energy: 10, energyAt: 0 }, 100, T)).toEqual({ energy: 10, energyAt: T });
  });
});
