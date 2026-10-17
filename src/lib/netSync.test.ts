import { describe, expect, it } from 'vitest';
import {
  MAX_EXTRAPOLATE_S,
  MOVING_REFRESH_MS,
  SAMPLE_MS,
  SentState,
  lookKey,
  parseChat,
  parsePeerMessage,
  parseRosterEntry,
  predict,
  shouldSend,
} from './netSync';

const LOOK = { hat: 'straw_hat', outfit: 'farmer_blue', wing: 'none', pet: 'none' };
const valid = { u: 'farmer_a', n: 'An', w: 'park', x: 1, z: 2, vx: 0, vz: 0, r: 0.5, c: LOOK, l: 4 };
const sent = (vx: number, vz: number, at: number, look = 'L'): SentState => ({ vx, vz, look, at });

// Samples a walk every SAMPLE_MS for `ms` and counts the messages it costs
function countSends(ms: number, velocity: (t: number) => [number, number]) {
  let last: SentState | null = null;
  let count = 0;
  for (let t = 0; t <= ms; t += SAMPLE_MS) {
    const [vx, vz] = velocity(t);
    if (shouldSend(last, vx, vz, 'L', t)) {
      count++;
      last = { vx, vz, look: 'L', at: t };
    }
  }
  return count;
}

describe('when a player sends their state', () => {
  it('sends the first sample', () => {
    expect(shouldSend(null, 0, 0, 'L', 0)).toBe(true);
  });

  it('standing still sends one refresh every 8 seconds', () => {
    expect(countSends(16000, () => [0, 0])).toBe(3);
  });

  it('walking straight sends about once a second', () => {
    const count = countSends(10000, () => [6, 0]);
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(12);
  });

  it('a walk round a square costs about two messages a side (the old way: 40)', () => {
    const sides: [number, number][] = [[6, 0], [0, 6], [-6, 0], [0, -6]];
    expect(countSends(8000, (t) => sides[Math.floor(t / 2000) % 4])).toBeLessThanOrEqual(10);
  });

  it('starting and stopping are sent at once', () => {
    expect(shouldSend(sent(0, 0, 0), 6, 0, 'L', 100)).toBe(true);
    expect(shouldSend(sent(6, 0, 0), 0, 0, 'L', 100)).toBe(true);
  });

  it('a turn of more than 20 degrees is sent, but not sooner than 250 ms after the last message', () => {
    const turned: [number, number] = [6 * Math.cos(0.5), 6 * Math.sin(0.5)];
    expect(shouldSend(sent(6, 0, 0), ...turned, 'L', 100)).toBe(false);
    expect(shouldSend(sent(6, 0, 0), ...turned, 'L', 300)).toBe(true);
  });

  it('a slight turn or a small change of speed waits for the next refresh', () => {
    const slight: [number, number] = [6 * Math.cos(0.2), 6 * Math.sin(0.2)];
    expect(shouldSend(sent(6, 0, 0), ...slight, 'L', 500)).toBe(false);
    expect(shouldSend(sent(6, 0, 0), 6.6, 0, 'L', 500)).toBe(false);
    expect(shouldSend(sent(6, 0, 0), 6.6, 0, 'L', MOVING_REFRESH_MS)).toBe(true);
  });

  it('a big change of speed is sent', () => {
    expect(shouldSend(sent(6, 0, 0), 8.5, 0, 'L', 300)).toBe(true);
  });

  it('a new look (outfit, name, level, chat bubble, emote) is sent at once', () => {
    expect(shouldSend(sent(0, 0, 0, 'L'), 0, 0, 'L2', 100)).toBe(true);
  });
});

describe('where another player is drawn', () => {
  it('carries on along their walk', () => {
    expect(predict({ x: 1, z: 2, vx: 6, vz: -3 }, 500)).toEqual({ x: 4, z: 0.5 });
  });

  it('stops carrying on 1.5 seconds after the last message', () => {
    expect(predict({ x: 0, z: 0, vx: 6, vz: 0 }, 5000)).toEqual({ x: 6 * MAX_EXTRAPOLATE_S, z: 0 });
  });

  it('a standing player stays put', () => {
    expect(predict({ x: 3, z: 4, vx: 0, vz: 0 }, 2000)).toEqual({ x: 3, z: 4 });
  });
});

describe('messages from the network', () => {
  it('a well-formed state passes unchanged', () => {
    expect(parsePeerMessage(valid)).toEqual(valid);
  });

  it('broken or impossible messages are dropped', () => {
    expect(parsePeerMessage(null)).toBeNull();
    expect(parsePeerMessage({ ...valid, u: '' })).toBeNull();
    expect(parsePeerMessage({ ...valid, w: 'moon' })).toBeNull();
    expect(parsePeerMessage({ ...valid, x: Infinity })).toBeNull();
    expect(parsePeerMessage({ ...valid, vx: 999 })).toBeNull();
    expect(parsePeerMessage({ ...valid, c: null })).toBeNull();
  });

  it('long text is cut short and a missing name gets a stand-in', () => {
    const message = parsePeerMessage({ ...valid, n: 'x'.repeat(100), m: 'y'.repeat(500) });
    expect(message?.n).toHaveLength(24);
    expect(message?.m).toHaveLength(120);
    expect(parsePeerMessage({ ...valid, n: 42 })?.n).toBe('Nông Dân');
  });

  it('a goodbye is kept', () => {
    expect(parsePeerMessage({ ...valid, bye: true })?.bye).toBe(true);
  });

  it('lobby presence and chat are checked too', () => {
    expect(parseRosterEntry({ n: 'An', w: 'beach', l: 3 })).toEqual({ n: 'An', w: 'beach', l: 3 });
    expect(parseRosterEntry({ n: 'An', w: 'space', l: 3 })).toBeNull();
    const chat = { id: 'msg_1', uid: 'farmer_a', sender: 'An', world: 'park', text: ' chào ', createdAt: 1 };
    expect(parseChat(chat)).toEqual({ ...chat, text: 'chào' });
    expect(parseChat({ ...chat, text: '   ' })).toBeNull();
  });

  it('the look key follows the outfit and the chat bubble, not the position', () => {
    const base = lookKey(valid);
    expect(lookKey({ ...valid, x: 9 } as typeof valid)).toBe(base);
    expect(lookKey({ ...valid, m: 'hi' })).not.toBe(base);
    expect(lookKey({ ...valid, c: { ...LOOK, hat: 'crown' } })).not.toBe(base);
  });
});
