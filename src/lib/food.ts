import { ActiveBuff, BuffId } from '@/types/game';
import { ANGLER_ZONE, NETTER_ZONE, STAMINA_BONUS, SWIFT_SPEED } from '@/config/food';

// The most stamina there is without a hearty meal
export const BASE_MAX_ENERGY = 100;

// The buff working today: the last dish eaten wears off when the day ends
export const activeBuff = (buff: ActiveBuff | null, day: number): BuffId | null =>
  buff && buff.day === day ? buff.id : null;

export const maxEnergyFor = (buff: ActiveBuff | null, day: number) =>
  BASE_MAX_ENERGY + (activeBuff(buff, day) === 'stamina' ? STAMINA_BONUS : 0);

// Multiplies the walking speed
export const walkSpeedScale = (buff: ActiveBuff | null, day: number) =>
  activeBuff(buff, day) === 'swift' ? SWIFT_SPEED : 1;

// Widens the green zone of the fishing reel
export const reelBuffScale = (buff: ActiveBuff | null, day: number) =>
  activeBuff(buff, day) === 'angler' ? ANGLER_ZONE : 1;

// Widens the green zone of the bug net
export const netBuffScale = (buff: ActiveBuff | null, day: number) =>
  activeBuff(buff, day) === 'netter' ? NETTER_ZONE : 1;

// Stamina comes back one point every three minutes, also while the game is closed
export const ENERGY_REGEN_MS = 3 * 60_000;

export interface EnergyState {
  energy: number;
  energyAt: number;
}

// Stamina at `now`: the points that came back since `energyAt`, up to `max`, keeping the time towards the next one
export function settleEnergy(state: EnergyState, max: number, now: number): EnergyState {
  if (!state.energyAt) return { energy: state.energy, energyAt: now };
  if (state.energy >= max) return state;
  const points = Math.floor(Math.max(0, now - state.energyAt) / ENERGY_REGEN_MS);
  if (points <= 0) return state;
  const energy = Math.min(max, state.energy + points);
  return { energy, energyAt: energy >= max ? now : state.energyAt + points * ENERGY_REGEN_MS };
}

// Spending at `now`; spent from full, the count towards the next point starts now
export function spendEnergy(state: EnergyState, amount: number, max: number, now: number): EnergyState {
  const settled = settleEnergy(state, max, now);
  return { energy: Math.max(0, settled.energy - amount), energyAt: settled.energy >= max ? now : settled.energyAt };
}

// Time until the next point comes back, or null when full
export function nextEnergyIn(state: EnergyState, max: number, now: number): number | null {
  const settled = settleEnergy(state, max, now);
  if (settled.energy >= max) return null;
  return ENERGY_REGEN_MS - (Math.max(0, now - settled.energyAt) % ENERGY_REGEN_MS);
}
