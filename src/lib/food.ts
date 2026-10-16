import { ActiveBuff, BuffId } from '@/types/game';
import { ANGLER_ZONE, NETTER_ZONE, STAMINA_BONUS, SWIFT_SPEED } from '@/config/food';

// Stamina a night's sleep brings back, and the most there is without a hearty meal
export const BASE_MAX_ENERGY = 100;

// The buff working today: the last dish eaten wears off when the player sleeps
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
