import { describe, expect, it } from 'vitest';
import {
  CloudDecision,
  LocalSaveState,
  decideCloudSync,
  parseCloudRow,
  profileFromUser,
} from '@/lib/cloudSave';

describe('decideCloudSync', () => {
  const guest: LocalSaveState = { linkedUserId: null, lastSyncedAt: null, dirty: false, fresh: false };
  const cases: [string, LocalSaveState, number | null, CloudDecision][] = [
    ['the account has no cloud save yet', guest, null, 'upload'],
    ['this device only has an untouched new game', { ...guest, fresh: true }, 1000, 'download'],
    [
      'the cloud still holds what this device last synced',
      { linkedUserId: 'u1', lastSyncedAt: 1000, dirty: true, fresh: false },
      1000,
      'upload',
    ],
    [
      'another device saved since and nothing changed here',
      { linkedUserId: 'u1', lastSyncedAt: 1000, dirty: false, fresh: false },
      2000,
      'download',
    ],
    [
      'another device saved since and this device has changes too',
      { linkedUserId: 'u1', lastSyncedAt: 1000, dirty: true, fresh: false },
      2000,
      'ask',
    ],
    [
      'another device with a slow clock saved since and this device has changes too',
      { linkedUserId: 'u1', lastSyncedAt: 1000, dirty: true, fresh: false },
      500,
      'ask',
    ],
    [
      "this device holds another account's farm",
      { linkedUserId: 'u2', lastSyncedAt: 1000, dirty: false, fresh: false },
      1000,
      'ask',
    ],
    ['this device holds a guest farm that has been played', guest, 1000, 'ask'],
  ];

  it.each(cases)('%s', (_, local, cloudSavedAt, expected) => {
    expect(decideCloudSync('u1', local, cloudSavedAt)).toBe(expected);
  });
});

describe('parseCloudRow', () => {
  it('finds no save when the account has no profile row', () => {
    expect(parseCloudRow(null)).toBeNull();
  });

  it('finds no save in a profile row that was never written to', () => {
    expect(parseCloudRow({ game_state: {}, updated_at: '2026-10-15T08:00:00.000Z' })).toBeNull();
  });

  it('reads a save written before saves carried a version as version 1', () => {
    expect(
      parseCloudRow({ game_state: { gold: 5, day: 2 }, updated_at: '2026-10-15T08:00:00.000Z' })
    ).toEqual({ data: { gold: 5, day: 2 }, version: 1, savedAt: Date.UTC(2026, 9, 15, 8) });
  });

  it('separates the version from the save data', () => {
    expect(
      parseCloudRow({
        game_state: { saveVersion: 2, gold: 5 },
        updated_at: '2026-10-15T08:00:00.000+00:00',
      })
    ).toEqual({ data: { gold: 5 }, version: 2, savedAt: Date.UTC(2026, 9, 15, 8) });
  });
});

describe('profileFromUser', () => {
  it('takes the name and avatar Google provides', () => {
    expect(
      profileFromUser({
        id: 'u1',
        email: 'an@gmail.com',
        user_metadata: { full_name: 'Nguyễn An', avatar_url: 'https://a.example/p.png' },
      })
    ).toEqual({
      id: 'u1',
      email: 'an@gmail.com',
      name: 'Nguyễn An',
      avatarUrl: 'https://a.example/p.png',
      provider: 'google',
    });
  });

  it('falls back to the other Google claim names', () => {
    const profile = profileFromUser({
      id: 'u2',
      email: 'binh@gmail.com',
      user_metadata: { name: 'Bình', picture: 'https://b.example/p.png' },
    });
    expect(profile.name).toBe('Bình');
    expect(profile.avatarUrl).toBe('https://b.example/p.png');
  });

  it('names the player after their email when Google gives no name', () => {
    const profile = profileFromUser({ id: 'u3', email: 'chi.le@gmail.com', user_metadata: {} });
    expect(profile.name).toBe('chi.le');
    expect(profile.avatarUrl).toBe('');
  });
});
