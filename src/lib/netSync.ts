import { ChatMessage, PlayerCosmetics, WorldId } from '@/types/game';

// What players tell each other and when (pure: lib/multiplayer does the talking). Supabase counts a broadcast
// to N listeners as 1 + N messages, so a player speaks only when what the others see would change: a walk starts,
// stops, turns or changes speed, the look changes, or a refresh is due.

// How often the local player is sampled
export const SAMPLE_MS = 100;
// Slower than this counts as standing
export const MOVING_SPEED = 0.2;
const TURN_DEGREES = 20;
const SPEED_CHANGE = 0.25;
// Turns and speed changes are sent no closer together than this
const MIN_GAP_MS = 250;
// Refreshes while walking and while standing (newcomers to a zone see everyone by the next one)
export const MOVING_REFRESH_MS = 1000;
export const IDLE_REFRESH_MS = 8000;
// A walk is carried on for at most this long after its last message
export const MAX_EXTRAPOLATE_S = 1.5;
// Players not heard from for this long have gone
export const PEER_TIMEOUT_MS = 25000;
// Faster than any walk (a teleport between two samples): sent as standing
export const MAX_SPEED = 20;

export const ZONES: WorldId[] = ['farm', 'park', 'beach', 'mall', 'cinema', 'casino'];

// A player's state on a zone channel. Every message carries all of it, so newcomers can draw the player from any one.
export interface PeerMessage {
  u: string;
  n: string;
  w: WorldId;
  x: number;
  z: number;
  // Velocity in units per second, 0 while standing
  vx: number;
  vz: number;
  r: number;
  c: PlayerCosmetics;
  l: number;
  // Chat bubble and emote
  m?: string;
  e?: string;
  // Leaving the zone
  bye?: true;
}

// Someone online anywhere, as their lobby presence describes them: name, zone, level
export interface RosterEntry {
  n: string;
  w: WorldId;
  l: number;
}

// What was last sent, to judge whether a new sample is worth a message
export interface SentState {
  vx: number;
  vz: number;
  look: string;
  at: number;
}

// Everything about a player except where they are; a change goes out at once
export const lookKey = (m: Pick<PeerMessage, 'n' | 'c' | 'l' | 'm' | 'e'>) =>
  [m.n, m.c.hat, m.c.outfit, m.c.wing, m.c.pet, m.l, m.m ?? '', m.e ?? ''].join('|');

export function shouldSend(last: SentState | null, vx: number, vz: number, look: string, now: number) {
  if (!last || look !== last.look) return true;
  const speed = Math.hypot(vx, vz);
  const lastSpeed = Math.hypot(last.vx, last.vz);
  const moving = speed > MOVING_SPEED;
  if (moving !== lastSpeed > MOVING_SPEED) return true;
  const gap = now - last.at;
  if (!moving) return gap >= IDLE_REFRESH_MS;
  if (gap >= MOVING_REFRESH_MS) return true;
  if (gap < MIN_GAP_MS) return false;
  const turned = (vx * last.vx + vz * last.vz) / (speed * lastSpeed) < Math.cos((TURN_DEGREES * Math.PI) / 180);
  const sped = Math.abs(speed - lastSpeed) / Math.max(speed, lastSpeed) > SPEED_CHANGE;
  return turned || sped;
}

// Where a player is `ageMs` after their message: their walk carried on, for at most MAX_EXTRAPOLATE_S
export function predict(p: { x: number; z: number; vx: number; vz: number }, ageMs: number) {
  const t = Math.min(Math.max(ageMs, 0) / 1000, MAX_EXTRAPOLATE_S);
  return { x: p.x + p.vx * t, z: p.z + p.vz * t };
}

const isNum = (v: unknown, limit: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isZone = (v: unknown): v is WorldId => ZONES.includes(v as WorldId);
const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

// Anyone can broadcast on a public channel, so nothing from the network is trusted: malformed messages are dropped,
// numbers must be finite and sane, text is cut short
export function parsePeerMessage(raw: unknown): PeerMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const { u, n, w, x, z, vx, vz, r, c, l, m, e, bye } = raw as Record<string, unknown>;
  if (!isId(u) || !isZone(w) || !c || typeof c !== 'object') return null;
  if (!isNum(x, 500) || !isNum(z, 500) || !isNum(vx, 50) || !isNum(vz, 50) || !isNum(r, 100) || !isNum(l, 1000)) {
    return null;
  }
  const look = c as Record<string, unknown>;
  const message: PeerMessage = {
    u,
    n: clip(n, 24) || 'Nông Dân',
    w,
    x,
    z,
    vx,
    vz,
    r,
    c: { hat: clip(look.hat, 40), outfit: clip(look.outfit, 40), wing: clip(look.wing, 40), pet: clip(look.pet, 40) },
    l: Math.round(l),
  };
  const bubble = clip(m, 120);
  const emote = clip(e, 8);
  if (bubble) message.m = bubble;
  if (emote) message.e = emote;
  if (bye === true) message.bye = true;
  return message;
}

export function parseRosterEntry(raw: unknown): RosterEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const { n, w, l } = raw as Record<string, unknown>;
  if (!isZone(w) || !isNum(l, 1000)) return null;
  return { n: clip(n, 24) || 'Nông Dân', w, l: Math.round(l) };
}

export function parseChat(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const { id, uid, sender, world, text, createdAt } = raw as Record<string, unknown>;
  const clean = clip(text, 200).trim();
  if (!isId(id) || !isId(uid) || !isZone(world) || !clean || !isNum(createdAt, 1e14)) return null;
  return { id, uid, sender: clip(sender, 24) || 'Nông Dân', world, text: clean, createdAt };
}
